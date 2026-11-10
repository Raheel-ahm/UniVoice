# UniVoice

Students report physical campus problems: broken equipment, electrical faults, plumbing leaks and damaged infrastructure. AI suggests the category, responsible department and priority, and the student can accept or change them. Department staff work through a fixed status workflow, and overdue issues are escalated on their dashboard.

```
D:\UniVoice
├── frontend/            React app (Vite)
│   ├── src/
│   └── .env.example     Frontend settings
└── backend/             Express API (Node 22+)
    ├── src/
    ├── db/              SQL: schema, rules (RLS, triggers, functions), seed data
    └── .env.example     Backend settings
```

## How it fits together

- **Browser:** signs in with Supabase Auth using the public anon key. It reads and writes all data through the UniVoice API, never straight from the tables.
- **API (`backend/`):** checks the user's Supabase token on every request and loads their role and department from the database. It calls Claude for suggestions, then calls the database functions using the service role key.
- **Database (`backend/db/02_rules.sql`):** enforces every rule even if the API is bypassed:
  - The status workflow is checked by a trigger on every update.
  - Students can't write to any table, and the API's functions can't be called with the anon key.
  - Reporters only ever see their own reports. Staff only see their department's issues and never see who reported them.
  - New accounts are always reporters.
  - `issue_overview` uses `security_invoker`, so the view follows these same rules.

### Rules

| Rule | Where it's enforced |
|---|---|
| Only reporters submit or join issues | `create_issue`, `join_issue` |
| Only staff of the issue's department change its status | `change_issue_status` |
| Workflow: `open → in_progress → resolved → closed`, plus `open → closed` and `resolved → in_progress` (both need a note) | `issues_guard` trigger + `change_issue_status` |
| Target time by priority: high 24 h, medium 72 h, low 7 days | `priority_sla`, set when the issue is created |
| Overdue = past the target time and still open or in progress → escalated to the top of the dashboard | `issue_overview.is_overdue` |
| AI values (`ai_*`) can't be faked | The API signs each suggestion and checks the signature when the issue is submitted |
| Duplicates are only merged when the student confirms | `find_duplicate_issues` only suggests matches. `join_issue` runs only when the student clicks "This is my problem" |
| Reporter identities stay private | Staff get notes and a count, never reporter IDs. Photo paths are random |

## Setup

### 1. Database (Supabase)

In the Supabase dashboard, go to **SQL Editor** and run these files in order:

1. `backend/db/01_schema.sql`: creates the tables if they don't exist yet. Your existing tables are left alone.
2. `backend/db/02_rules.sql`: the view, triggers, row-level security policies, functions and the private `issue-images` storage bucket.
3. `backend/db/03_seed.sql` (optional): starter departments and categories.

> If your tables were created earlier with different enum type names, `01_schema.sql` simply skips them. `02_rules.sql` doesn't depend on those names.

**Making a staff account.** Have the person sign up in the app first, then run:

```sql
update public.profiles
set role = 'admin',
    department_id = (select id from public.departments where name = 'Electrical')
where id = (select id from auth.users where email = 'staff.member@campus.edu');
```

### 2. Backend

Run `npm install` in `backend/`, then copy `backend/.env.example` to `backend/.env` and fill in:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: from Project Settings → API. Keep the service role key secret and never put it in the frontend.
- `ANTHROPIC_API_KEY`: needed for AI suggestions. Leave it empty and the app still works, with students choosing everything manually.
- `SUGGESTION_SECRET`: any long random string.

Start it:

```bash
cd backend
npm run dev
```

### 3. Frontend

Run `npm install` in `frontend/`, then copy `frontend/.env.example` to `frontend/.env.local` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then start it in a second terminal:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. In development, Vite forwards `/api` to the backend on port 4000.

## AI suggestions

`backend/src/services/classifier.js` sends the report to Claude (`claude-opus-5-5` at low effort). Claude replies in a fixed format, picking from your actual categories and departments. Server-side refusal fallback is turned on.

If the AI is unavailable for any reason, students fill in the fields themselves and the issue is saved with `ai_used = false`. That covers a missing key, a timeout, a rate limit or a refusal.

## API

All routes need `Authorization: Bearer <supabase access token>`, except `/api/health`.

| Method | Path | Who |
|---|---|---|
| GET | `/api/me`, `/api/meta` | anyone signed in |
| POST | `/api/ai/classify` | reporter |
| POST | `/api/issues/duplicates` | reporter |
| POST | `/api/issues` (multipart, optional `image`) | reporter |
| POST | `/api/issues/:id/join` | reporter |
| GET | `/api/issues/mine` | reporter |
| GET | `/api/issues/:id` | a reporter linked to the issue, or staff of its department |
| GET | `/api/staff/issues` | staff |
| PATCH | `/api/staff/issues/:id/status` | staff |
