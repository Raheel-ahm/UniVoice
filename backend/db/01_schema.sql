-- UniVoice schema.
-- Safe to run on a database that already has these tables: every statement is
-- "if not exists", so existing tables are left untouched.

create extension if not exists pg_trgm with schema extensions;

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists public.departments (
  id   smallint primary key,
  name text not null unique
);

create table if not exists public.categories (
  id                    smallint primary key,
  name                  text not null unique,
  default_department_id smallint not null references public.departments (id)
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  role          public.user_role not null default 'user',
  department_id smallint references public.departments (id),
  created_at    timestamptz not null default now(),
  constraint profiles_staff_need_department check (role <> 'admin' or department_id is not null)
);

create table if not exists public.issues (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 3 and 150),
  description      text not null check (char_length(description) between 10 and 2000),
  building         text not null,
  room             text,
  image_path       text,
  category_id      smallint not null references public.categories (id),
  department_id    smallint not null references public.departments (id),
  priority         public.issue_priority not null default 'medium',
  status           public.issue_status not null default 'open',
  ai_used          boolean not null default false,
  ai_category_id   smallint references public.categories (id),
  ai_department_id smallint references public.departments (id),
  ai_priority      public.issue_priority,
  reporter_count   int not null default 1 check (reporter_count >= 1),
  due_at           timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create table if not exists public.issue_reporters (
  issue_id    uuid not null references public.issues (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  note        text,
  is_original boolean not null default false,
  joined_at   timestamptz not null default now(),
  primary key (issue_id, reporter_id)
);

create table if not exists public.status_history (
  id         bigint generated always as identity primary key,
  issue_id   uuid not null references public.issues (id) on delete cascade,
  old_status public.issue_status,
  new_status public.issue_status not null,
  changed_by uuid not null references public.profiles (id),
  note       text,
  changed_at timestamptz not null default now()
);

create index if not exists issues_department_status_idx on public.issues (department_id, status);
create index if not exists issues_building_idx on public.issues (lower(building));
create index if not exists issues_title_trgm_idx on public.issues using gin (title extensions.gin_trgm_ops);
create index if not exists issue_reporters_reporter_idx on public.issue_reporters (reporter_id);
create index if not exists status_history_issue_idx on public.status_history (issue_id, changed_at);
