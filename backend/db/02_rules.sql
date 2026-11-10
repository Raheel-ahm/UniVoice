-- UniVoice server-side rules: view, triggers, row level security and the
-- functions the API calls. Re-runnable: everything is "create or replace" or
-- dropped first.
--
-- Write model: browsers never write to these tables. The backend API calls the
-- security-definer functions below with the service role key, after it has
-- verified who the caller is. Those functions are not executable by the
-- anon/authenticated roles, so a student holding the public anon key cannot
-- call them directly. RLS policies only grant narrow read access.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- View
-- ---------------------------------------------------------------------------
-- security_invoker makes the view respect the RLS policies of the caller;
-- without it a view runs as its owner and would expose every issue.
create or replace view public.issue_overview with (security_invoker = true) as
select
  i.*,
  c.name as category_name,
  d.name as department_name,
  (i.status in ('open', 'in_progress') and i.due_at < now()) as is_overdue
from public.issues i
join public.categories c on c.id = i.category_id
join public.departments d on d.id = i.department_id;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Time allowed before an issue counts as overdue (and is escalated on the
-- staff dashboard).
create or replace function public.priority_sla(p_priority text)
returns interval
language sql immutable
as $$
  select case p_priority
    when 'high'   then interval '24 hours'
    when 'medium' then interval '72 hours'
    else               interval '7 days'
  end
$$;

create or replace function public.current_staff_department()
returns smallint
language sql stable security definer
set search_path = public
as $$
  select department_id from public.profiles where id = auth.uid() and role = 'admin'
$$;

-- ---------------------------------------------------------------------------
-- New users always start as reporters. Staff accounts are promoted by an
-- administrator (see backend/README.md); nobody can make themselves staff.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Issue guard: fixes server-owned columns and enforces the status workflow
-- for every write, whoever makes it.
--
--   open --------> in_progress --------> resolved --------> closed
--     \                 ^                    |
--      \                +---- (reopen) ------+
--       +--> closed  (rejected / not actionable, note required)
-- ---------------------------------------------------------------------------
create or replace function public.issues_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.status      := 'open';
    new.created_at  := now();
    new.updated_at  := now();
    new.resolved_at := null;
    new.due_at      := now() + public.priority_sla(new.priority::text);
    return new;
  end if;

  new.created_at := old.created_at;
  new.updated_at := now();

  if new.status is distinct from old.status then
    if (old.status::text, new.status::text) not in (
      ('open', 'in_progress'),
      ('open', 'closed'),
      ('in_progress', 'resolved'),
      ('resolved', 'in_progress'),
      ('resolved', 'closed')
    ) then
      raise exception 'UV_INVALID_TRANSITION: cannot move an issue from % to %', old.status, new.status;
    end if;

    if new.status = 'resolved' then
      new.resolved_at := now();
    elsif new.status = 'in_progress' then
      new.resolved_at := null;
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists issues_guard on public.issues;
create trigger issues_guard
  before insert or update on public.issues
  for each row execute function public.issues_guard();

-- ---------------------------------------------------------------------------
-- Row level security (read-only access for signed-in users)
-- ---------------------------------------------------------------------------
alter table public.departments     enable row level security;
alter table public.categories      enable row level security;
alter table public.profiles        enable row level security;
alter table public.issues          enable row level security;
alter table public.issue_reporters enable row level security;
alter table public.status_history  enable row level security;

revoke insert, update, delete on
  public.departments, public.categories, public.profiles,
  public.issues, public.issue_reporters, public.status_history
from anon, authenticated;

drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments
  for select to authenticated using (true);

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select to authenticated using (true);

drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = auth.uid());

-- Staff see their department's issues; reporters see issues they are linked to.
drop policy if exists issues_read on public.issues;
create policy issues_read on public.issues
  for select to authenticated using (
    department_id = public.current_staff_department()
    or exists (
      select 1 from public.issue_reporters r
      where r.issue_id = issues.id and r.reporter_id = auth.uid()
    )
  );

-- Reporters see only their own link rows. Staff get nothing here, so reporter
-- identities never reach them.
drop policy if exists issue_reporters_read_own on public.issue_reporters;
create policy issue_reporters_read_own on public.issue_reporters
  for select to authenticated using (reporter_id = auth.uid());

drop policy if exists status_history_read on public.status_history;
create policy status_history_read on public.status_history
  for select to authenticated using (
    exists (select 1 from public.issues i where i.id = status_history.issue_id)
  );

-- ---------------------------------------------------------------------------
-- API functions (service role only)
-- ---------------------------------------------------------------------------

-- Creates an issue and links the reporter as its original reporter.
-- ai_* values are only trusted because the API verifies a signed token from
-- its own classifier before passing them in.
create or replace function public.uv_create_issue(
  p_reporter         uuid,
  p_title            text,
  p_description      text,
  p_building         text,
  p_room             text,
  p_image_path       text,
  p_category_id      int,
  p_department_id    int,
  p_priority         text,
  p_ai_used          boolean,
  p_ai_category_id   int,
  p_ai_department_id int,
  p_ai_priority      text,
  p_note             text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id          uuid;
  v_priority    public.issues.priority%type;
  v_ai_priority public.issues.ai_priority%type;
begin
  if not exists (select 1 from public.profiles where id = p_reporter and role = 'user') then
    raise exception 'UV_FORBIDDEN: only student reporters can submit issues';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 150 then
    raise exception 'UV_VALIDATION: title must be 3-150 characters';
  end if;
  if char_length(btrim(coalesce(p_description, ''))) not between 10 and 2000 then
    raise exception 'UV_VALIDATION: description must be 10-2000 characters';
  end if;
  if btrim(coalesce(p_building, '')) = '' then
    raise exception 'UV_VALIDATION: building is required';
  end if;
  if coalesce(p_priority, '') not in ('low', 'medium', 'high') then
    raise exception 'UV_VALIDATION: priority must be low, medium or high';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'UV_VALIDATION: unknown category';
  end if;
  if not exists (select 1 from public.departments where id = p_department_id) then
    raise exception 'UV_VALIDATION: unknown department';
  end if;

  v_priority := p_priority;
  if coalesce(p_ai_used, false) then
    if coalesce(p_ai_priority, '') not in ('low', 'medium', 'high') then
      raise exception 'UV_VALIDATION: invalid AI priority';
    end if;
    v_ai_priority := p_ai_priority;
  end if;

  insert into public.issues (
    title, description, building, room, image_path,
    category_id, department_id, priority,
    ai_used, ai_category_id, ai_department_id, ai_priority,
    reporter_count, due_at
  ) values (
    btrim(p_title), btrim(p_description), btrim(p_building), nullif(btrim(p_room), ''), p_image_path,
    p_category_id, p_department_id, v_priority,
    coalesce(p_ai_used, false),
    case when p_ai_used then p_ai_category_id end,
    case when p_ai_used then p_ai_department_id end,
    v_ai_priority,
    1, now() -- due_at is recomputed by issues_guard
  )
  returning id into v_id;

  insert into public.issue_reporters (issue_id, reporter_id, note, is_original)
  values (v_id, p_reporter, nullif(btrim(p_note), ''), true);

  return v_id;
end
$$;

-- Likely duplicates: active issues in the same building from the last 30 days
-- whose text is similar. Category and room matches add to the score.
create or replace function public.uv_find_duplicate_issues(
  p_building    text,
  p_category_id int,
  p_room        text,
  p_title       text,
  p_description text,
  p_limit       int default 5
)
returns table (
  id              uuid,
  title           text,
  description     text,
  building        text,
  room            text,
  status          text,
  category_name   text,
  department_name text,
  reporter_count  int,
  created_at      timestamptz,
  score           real
)
language sql stable security definer
set search_path = public, extensions
as $$
  select * from (
    select
      i.id, i.title, i.description, i.building, i.room, i.status::text as status,
      c.name as category_name, d.name as department_name, i.reporter_count, i.created_at,
      (
        0.60 * similarity(lower(i.title), lower(p_title))
        + 0.25 * similarity(lower(i.description), lower(p_description))
        + case when i.category_id = p_category_id then 0.15 else 0 end
        + case when p_room is not null and btrim(p_room) <> ''
                    and lower(btrim(i.room)) = lower(btrim(p_room)) then 0.10 else 0 end
      )::real as score
    from public.issues i
    join public.categories c on c.id = i.category_id
    join public.departments d on d.id = i.department_id
    where i.status in ('open', 'in_progress')
      and lower(btrim(i.building)) = lower(btrim(p_building))
      and i.created_at > now() - interval '30 days'
  ) candidates
  where candidates.score >= 0.30
  order by candidates.score desc
  limit least(greatest(coalesce(p_limit, 5), 1), 10)
$$;

-- Adds a reporter to an existing issue. Called only after the student has
-- confirmed the duplicate. Returns false if they were already linked.
create or replace function public.uv_join_issue(p_issue uuid, p_reporter uuid, p_note text default null)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not exists (select 1 from public.profiles where id = p_reporter and role = 'user') then
    raise exception 'UV_FORBIDDEN: only student reporters can join issues';
  end if;

  select status::text into v_status from public.issues where id = p_issue for update;
  if not found then
    raise exception 'UV_NOT_FOUND: issue not found';
  end if;
  if v_status not in ('open', 'in_progress') then
    raise exception 'UV_CONFLICT: this issue is already %', replace(v_status, '_', ' ');
  end if;

  insert into public.issue_reporters (issue_id, reporter_id, note, is_original)
  values (p_issue, p_reporter, nullif(btrim(p_note), ''), false)
  on conflict do nothing;

  if not found then
    return false;
  end if;

  update public.issues set reporter_count = reporter_count + 1 where id = p_issue;
  return true;
end
$$;

-- Moves an issue through the workflow. Only staff of the issue's department.
create or replace function public.uv_change_issue_status(
  p_issue      uuid,
  p_actor      uuid,
  p_new_status text,
  p_note       text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_staff_dept smallint;
  v_issue_dept smallint;
  v_old        public.issues.status%type;
  v_new        public.issues.status%type;
  v_note       text := nullif(btrim(p_note), '');
begin
  select department_id into v_staff_dept
  from public.profiles where id = p_actor and role = 'admin';
  if v_staff_dept is null then
    raise exception 'UV_FORBIDDEN: only department staff can change status';
  end if;

  select department_id, status into v_issue_dept, v_old
  from public.issues where id = p_issue for update;
  if not found then
    raise exception 'UV_NOT_FOUND: issue not found';
  end if;
  if v_issue_dept <> v_staff_dept then
    raise exception 'UV_FORBIDDEN: this issue belongs to another department';
  end if;
  if coalesce(p_new_status, '') not in ('open', 'in_progress', 'resolved', 'closed') then
    raise exception 'UV_VALIDATION: unknown status';
  end if;
  if v_old::text = p_new_status then
    raise exception 'UV_CONFLICT: issue is already %', replace(p_new_status, '_', ' ');
  end if;
  if v_note is null and (
    (v_old = 'open' and p_new_status = 'closed')
    or (v_old = 'resolved' and p_new_status = 'in_progress')
  ) then
    raise exception 'UV_VALIDATION: a note is required to close without resolving or to reopen';
  end if;

  v_new := p_new_status;
  update public.issues set status = v_new where id = p_issue; -- issues_guard validates the move

  insert into public.status_history (issue_id, old_status, new_status, changed_by, note)
  values (p_issue, v_old, v_new, p_actor, v_note);
end
$$;

revoke execute on function
  public.uv_create_issue(uuid, text, text, text, text, text, int, int, text, boolean, int, int, text, text),
  public.uv_find_duplicate_issues(text, int, text, text, text, int),
  public.uv_join_issue(uuid, uuid, text),
  public.uv_change_issue_status(uuid, uuid, text, text)
from public, anon, authenticated;

grant execute on function
  public.uv_create_issue(uuid, text, text, text, text, text, int, int, text, boolean, int, int, text, text),
  public.uv_find_duplicate_issues(text, int, text, text, text, int),
  public.uv_join_issue(uuid, uuid, text),
  public.uv_change_issue_status(uuid, uuid, text, text)
to service_role;

-- ---------------------------------------------------------------------------
-- Private bucket for issue photos. No storage policies are added, so only the
-- backend (service role) can read or write; viewers get short-lived signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', false)
on conflict (id) do nothing;
