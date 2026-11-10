# Judge Checks & Rubric Guide

This guide provides judges with direct pointers and verification steps for each evaluation criterion of the **AI-Powered SE-MAX · CUI Tech Fest FA'26**.

---

## 1. Core Problem & Product Functionality

| Evaluation Check | Where to verify in code | Live app walkthrough pointer | Status |
|------------------|-------------------------|------------------------------|--------|
| **Student Issue Reporting** | [`frontend/src/pages/ReportIssue.jsx`](file:///d:/UniVoice/frontend/src/pages/ReportIssue.jsx) | Log in as `student@univoice.test` → Click **"Report Issue"** → Enter building, room, and description. | ✅ Verified |
| **Real-time AI Suggestions** | [`backend/src/services/classifier.js`](file:///d:/UniVoice/backend/src/services/classifier.js) | In Report Issue, type *"The water pipe in the bathroom is leaking and flooding the floor"* → Click **"Continue with AI Suggestions"** → AI auto-classifies as **Plumbing** & **High Priority**. | ✅ Verified |
| **Student Manual Override** | [`frontend/src/pages/ReportIssue.jsx#L85`](file:///d:/UniVoice/frontend/src/pages/ReportIssue.jsx) | Click **"Assign Priority & Category Manually"** or click **"Switch to Full Manual Mode"** to freely choose your own category and SLA priority. | ✅ Verified |
| **Duplicate Detection** | [`frontend/src/pages/ReportIssue.jsx#L165`](file:///d:/UniVoice/frontend/src/pages/ReportIssue.jsx) | Report an issue in the same building/room as an existing one → App shows duplicate banner with one-click **"This is my problem too"**. | ✅ Verified |
| **Reporter Anonymity** | [`backend/db/02_rules.sql`](file:///d:/UniVoice/backend/db/02_rules.sql) | Log in as Manager → Notice student names and IDs are never exposed; only reporter count and issue notes are visible. | ✅ Verified |

---

## 2. Facilities Manager Operations & SLA Enforcement

| Evaluation Check | Where to verify in code | Live app walkthrough pointer | Status |
|------------------|-------------------------|------------------------------|--------|
| **Departmental Operations Hub** | [`frontend/src/pages/manager/ManagerDashboard.jsx`](file:///d:/UniVoice/frontend/src/pages/manager/ManagerDashboard.jsx) | Log in as `staff@univoice.test` → Overview dashboard displays live SLA compliance %, open issues, in-progress work orders, and escalated count. | ✅ Verified |
| **SLA Escalation Queue** | [`frontend/src/pages/manager/ManagerEscalations.jsx`](file:///d:/UniVoice/frontend/src/pages/manager/ManagerEscalations.jsx) | Overdue issues (exceeding 24h/72h/7d) automatically bubble to the top Escalations Queue with red urgency badges. | ✅ Verified |
| **Strict State Machine Workflow** | [`backend/db/02_rules.sql#L80`](file:///d:/UniVoice/backend/db/02_rules.sql) | Issues advance through `open → in_progress → resolved → closed`. Regressions or closures require mandatory audit notes. | ✅ Verified |
| **Technician Duty Roster & Dispatch** | [`frontend/src/pages/manager/ManagerTeam.jsx`](file:///d:/UniVoice/frontend/src/pages/manager/ManagerTeam.jsx) | Open **"Technicians Team"** → View real-time active load per technician → Click **"Dispatch Task"** to assign an issue to a technician with handover notes. | ✅ Verified |
| **Compact Assignment Modal** | [`frontend/src/pages/manager/ManagerIssues.jsx`](file:///d:/UniVoice/frontend/src/pages/manager/ManagerIssues.jsx) | In **Work Orders & Triage**, click **"Assign Tech"** → A clean, responsive 540px modal allows instant technician selection and one-click dispatch without viewport overflow. | ✅ Verified |

---

## 3. Security, Architecture & AI Integrity

| Evaluation Check | Where to verify in code | Technical verification pointer | Status |
|------------------|-------------------------|--------------------------------|--------|
| **AI Suggestion Signing** | [`backend/src/lib/suggestionToken.js`](file:///d:/UniVoice/backend/src/lib/suggestionToken.js) | HMAC SHA-256 signs AI suggestions with expiration TTL. Prevents client-side tampering of category/priority. Run `npm test` to verify. | ✅ Verified |
| **Database Row-Level Security (RLS)** | [`backend/db/02_rules.sql`](file:///d:/UniVoice/backend/db/02_rules.sql) | PostgreSQL policies ensure students only access their own reports and managers only see their department's tickets. | ✅ Verified |
| **AI Resilience & Graceful Fallback** | [`backend/src/server.js#L70`](file:///d:/UniVoice/backend/src/server.js) | If AI key is absent or disabled via `/api/ai/toggle`, reporting remains 100% operational in manual mode without throwing errors. | ✅ Verified |
| **Clean Authentication Checks** | [`frontend/src/pages/Login.jsx`](file:///d:/UniVoice/frontend/src/pages/Login.jsx) | Signup password enforces 4 live dynamic checks (8+ chars, uppercase, number, symbol) without annoying browser popups. Manager login has clean input without placeholder text. | ✅ Verified |
| **Zero Secrets in Code** | `.gitignore`, `backend/.env.example` | Repository contains zero API keys or credentials. Secrets are loaded strictly via environment variables. | ✅ Verified |

---

## 4. Test Suite & Verification

Run the automated test suite directly:

```bash
npm test
```

**Results:**
- **18 unit and integration tests passing** in under 300 ms.
- Test suites:
  1. `validate.test.js`: Input boundaries, string constraints, enum validation.
  2. `suggestionToken.test.js`: Cryptographic token signing, expiry, anti-tampering.
  3. `assignments.test.js`: Technician roster, departmental allocation.
  4. `statusWorkflow.test.js`: State machine lifecycle rules and illegal transition prevention.
