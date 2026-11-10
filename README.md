# UniVoice

> AI-Powered SE-MAX · CUI Tech Fest FA'26 · Team: UniVoice (Raheel Ahmad)

## What it does

UniVoice is an intelligent, privacy-first campus incident reporting and facilities operations platform. It combines automated AI triage (category, department, and SLA priority suggestions), duplicate problem detection, anonymous student protection, and real-time manager-to-technician dispatch with automatic SLA escalation.

## Problem and user

- **The Problem:** Campus infrastructure defects (broken lab equipment, power failures, plumbing leaks) suffer from slow reporting, duplicate submissions, lost accountability, and delayed technician dispatch.
- **The Users:**
  1. **Students & Faculty:** Need a fast, anonymous way to report campus issues and see them resolved without bureaucratic hurdles.
  2. **Facilities Managers:** Need centralized triage, automated SLA escalation tracking, and direct field technician dispatch tools.
  3. **Field Technicians:** Need clear work orders with assigned zones, radio channels, and handover notes.

## Live deployment

- **URL / install link:** https://univoice.vercel.app (Unified Vercel deployment)
- **Platform:** Vercel (Single full-stack deployment with Express Serverless API & Vite React SPA)

## Judge quick start (under 5 minutes)

Follow these steps to evaluate the product end-to-end:

1. **Test Student Incident Reporting & AI Triage:**
   - Log in with the **Student account** (`student@univoice.test` / `Uv-q96zotK69`).
   - Click **"Report Issue"**.
   - Enter Building (e.g., `Science Block A`), Room (`Lab 204`), and Description:
     *"The air conditioner has a major water leak dripping over the power strip and power has tripped."*
   - Click **"Continue with AI Suggestions"**: Notice how AI instantly recommends the Category (`Air Conditioning & Ventilation`), Department (`HVAC`), and Priority (`High` - 24h SLA).
   - Alternatively, test manual control: Click **"Switch to Full Manual Mode"** to assign your own category/priority.
   - Click **"Submit Work Order"**.
2. **Test Duplicate Detection:**
   - Report another issue with the same building and room. Notice the instant duplicate banner prompting you to click **"This is my problem too"** without cluttering the maintenance queue.
3. **Test Manager Operations Hub & SLA Escalation:**
   - Log out, then log in with the **Facilities Manager account** (`staff@univoice.test` / `Uv-dkPJh-b99`).
   - Review the **Electrical Manager Dashboard**: view live SLA metrics, open work orders, and escalated overdue tickets.
   - Open **"Work Orders & Triage"**: click on an issue to review triage notes and advance the state machine workflow (`open → in_progress → resolved → closed`).
4. **Test Technician Dispatch:**
   - On any work order, click **"Assign Tech"** (or go to **"Technicians Team"**).
   - Use the compact assignment dialog to select an on-duty technician (e.g., *David Miller*), enter an optional handover note, and click **"Confirm & Assign"**.
   - Notice the technician's workload and status update in real-time.
5. **Test Emergency Hotline:**
   - Click **"Emergency Dispatch"** in the sidebar or navigation to view instant one-click campus security calling for urgent safety hazards.

## Test accounts

| Role | Username / email | Password |
|------|------------------|----------|
| Student (`user`) | `student@univoice.test` | `Uv-q96zotK69` |
| Facilities Manager (`admin`, Electrical) | `staff@univoice.test` | `Uv-dkPJh-b99` |

> *Note: These are pre-seeded demo accounts with privacy protection enabled. Passwords meet the strict security checklist.*

## Run locally

### Prerequisites

- Node.js 22 or higher
- npm 10 or higher
- A free Supabase project (PostgreSQL + Auth + Storage)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Raheel-ahm/UniVoice.git
cd UniVoice

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Environment variables

Copy `.env.example` to `.env` in both folders:

**`backend/.env`**:
- `PORT` (e.g. 4000)
- `FRONTEND_ORIGIN` (e.g. http://localhost:5173)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (optional for AI suggestions)
- `SUGGESTION_SECRET` (random string)

**`frontend/.env.local`**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Run

Start backend and frontend in separate terminals:

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Frontend Client
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

### Run tests

Run the automated test suite directly:

```bash
npm test
```

## Known limitations

1. In-app voice calling uses system phone links (`tel:`) rather than WebRTC audio streams.
2. The technician assignment file storage in serverless environments is persisted under `/tmp` (ephemeral across long cold starts unless backed by dedicated database tables).

## Documentation

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [AI usage log](docs/ai-usage-log.md)
- [Judge checks](docs/judge-checks.md)

## Team

| Name | Role | Contact |
|------|------|---------|
| Raheel Ahmad | Full Stack Developer & System Architect | rahilahm456@gmail.com |
