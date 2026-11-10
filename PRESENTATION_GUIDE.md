# UniVoice — Product Brief & Presentation Guide

Deck: https://claude.ai/artifact/UcqcwvMFz4DZTTjWXc87uM (18 slides, about 15 minutes with the demo).
The full speech for each slide is also saved as **speaker notes** inside the deck.

---

## Part 1 — The product in detail

### One-line pitch
UniVoice is a web platform where students report physical campus problems in under a minute, AI routes each report to the right department, and every repair has a deadline that managers are held to.

### The problem it solves
1. **Students don't know who to tell.** Electrical team? Estate office? Hostel warden? So most problems are never reported.
2. **Complaints get lost.** WhatsApp groups, emails, paper registers. The same issue arrives ten times, or not at all.
3. **No accountability.** Nobody measures repair time, so a dangerous fault waits as long as a scratched wall.

### Who uses it
| Role | Portal | What they do |
|---|---|---|
| Student (reporter) | Student Portal | Report problems, join existing reports, track status |
| Department manager (staff) | Manager Portal | See their department's queue, assign technicians, update status, watch deadlines |

Students sign up themselves. Manager accounts are created by the admin; nobody can sign up as staff.

### Features — Student side
- **4-step report form:** describe → duplicate check → review AI suggestion → submit (with optional photo).
- **AI triage:** Google Gemini suggests category, department and priority with a one-line reason. The student can accept or edit. If AI is off or down, the form works manually.
- **"Me too" duplicates:** before saving, the database searches open issues in the same building and category with similar wording (PostgreSQL trigram similarity). The student can join an existing issue instead of creating a new one. Merging only happens when the student confirms.
- **My Reports:** every report with a status timeline.
- **Emergency hotline:** fire, gas, sparks — one tap to campus security instead of waiting in a queue.
- **Instant sign-up:** no email confirmation, live 4-point password checklist (8+ chars, uppercase, number, special character).

### Features — Manager side
- **Overview Dashboard:** open / in progress / resolved / overdue counts.
- **Work Orders & Triage:** search, filter, move issues through the workflow.
- **Technicians Team:** assign each work order to a technician.
- **Escalations Queue:** overdue issues first, most overdue at the top.
- **SLA Analytics:** on-time rate, workload, trends by category.
- **Emergency Dispatch:** direct line to campus security.
- Managers only see their own department's issues.

### Deadlines (SLA) and workflow
| Priority | Meaning | Deadline |
|---|---|---|
| High | Safety risk (exposed wiring, flooding, locked exit) | 24 hours |
| Medium | Blocks teaching/studies (broken projector, AC, toilet) | 72 hours |
| Low | Cosmetic (paint, flickering corridor bulb) | 7 days |

Workflow: **Open → In progress → Resolved → Closed** (also Open → Closed, and Resolved → In progress to reopen). The database refuses any other jump. An issue that is past its deadline and still Open or In progress is **overdue** and escalated.

### Privacy and security (good to stress — examiners like this)
- **Reporter identity is hidden from staff.** Managers see the problem, never who reported it.
- **Rules are enforced in the database**, not just the UI: row-level security (RLS) policies, a trigger that guards the status workflow, and security-definer functions only the backend can call.
- **AI suggestions are HMAC-signed** by the server, so a user can't fake "AI said high priority" to jump the queue. The app also records whether the student changed the AI's answer (measures AI accuracy).
- **Rate limits** on sign-up and AI calls, Zod validation on every request, **private storage** for photos (shown only via short-lived signed links).

### Technology
| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express 5, Zod, Multer (uploads) |
| Database & auth | Supabase — PostgreSQL, Auth, Storage, RLS, pg_trgm |
| AI | Google Gemini (Claude as optional fallback) |
| Hosting | Vercel — frontend + API serverless in one deployment |

### How it is sold (business)
- **Customer (who pays):** estate / facilities head or registrar of a college or university. **Users:** students and maintenance staff.
- **Markets:** universities & colleges first → schools and coaching chains → offices, hospitals, housing societies.
- **Model:** SaaS yearly subscription.
  - **Pilot:** free, 3 months, 1 building.
  - **Campus:** [₹__] per student per year, whole campus.
  - **Enterprise:** custom quote, multi-campus, SSO with college login, ERP integration, branding, priority support.
  - **Extra revenue:** setup & training fee, QR room stickers, AI add-ons.
- **Low running cost** (Vercel + Supabase), so margins are high.
- **Go-to-market:** pilot on own campus → case study with before/after numbers → direct sales to facilities heads (demos, expos, referrals) → partner with campus ERP vendors and college chains.
- **Competition:** WhatsApp/email (free but no tracking) and generic helpdesks (powerful but not campus-aware, confusing for students). UniVoice = WhatsApp-easy + helpdesk-control + campus-specific features (rooms, duplicates, anonymity).

### Roadmap
QR code in every room · email/push notifications · mobile + technician app · photo AI · regional languages · predictive maintenance.

---

## Part 2 — What to say, slide by slide

Speak slowly; aim for ~15 minutes total. Times are approximate.

1. **Cover (0:30)** — "Good morning. We are [names], and our final project is UniVoice — a platform where students report campus problems and the right department fixes them on time. I'll show the problem, our idea, how it works, a live demo, and how we can sell it."
2. **Problem (1:00)** — "Every campus has leaking taps, dead projectors, sparking switches. Students don't know who to tell, complaints get lost in WhatsApp and registers, and nobody measures how long repairs take."
3. **Idea (0:30)** — "Our idea: Report it. Route it. Fix it. One place to report, AI to route, and a live queue with deadlines for every department."
4. **How it works (1:00)** — Walk the 5 steps: report → AI triage → duplicate check → department queue and technician → fixed and closed. "Deadlines run the whole time; late issues escalate automatically."
5. **Student portal (1:00)** — 4-step form, AI fills the form but student decides, "Me too" button, live tracking, emergency hotline, instant sign-up.
6. **AI triage (1:00)** — Read the example card aloud. "The AI only suggests; the student can edit. If AI is down, the form still works. Suggestions are signed on the server so nobody can fake a high priority."
7. **Duplicates (0:45)** — "Ten students, one projector — one ticket. Same building, same category, similar words → 'Is this your problem?' The manager sees how many students are affected."
8. **Manager portal (1:00)** — Read the table quickly: overview, work orders, technicians, escalations, analytics, emergency dispatch. "Managers only see their department."
9. **Deadlines (0:45)** — "High 24 hours, medium 72, low 7 days. The database enforces the workflow. Late issues jump to the top of the Escalations Queue — that's accountability."
10. **Privacy (0:45)** — "Managers never see who reported. These rules are inside the database, so even someone calling the API directly can't break them."
11. **Technology (0:45)** — "React frontend, Node/Express API, Supabase PostgreSQL, Gemini AI, deployed on Vercel — low cost, which matters for the business."
12. **Live demo (3:00)** — Follow the 6 steps on the slide (see checklist below).
13. **Market (1:00)** — "Colleges first, then schools and chains, then offices and hospitals. The buyer is the facilities head, not the student." Add a real number for your region if you have one, with its source.
14. **Business model (1:00)** — "Free 3-month pilot, then per-student yearly price, enterprise for multi-campus. Plus setup fees, QR stickers, AI add-ons."
15. **Go-to-market (1:00)** — "Pilot on our campus, turn it into a case study, sell to facilities heads, then partner with ERP vendors."
16. **Why we win (0:45)** — "WhatsApp is easy but uncontrolled. Helpdesks are controlled but not built for campuses. We are both — plus duplicates and anonymity."
17. **Roadmap (0:45)** — QR codes and notifications next, then mobile app and photo AI, then languages and predictive maintenance.
18. **Thank you (0:20)** — "UniVoice turns scattered complaints into accountable repairs. It works end to end today. Thank you — questions?"

### Demo checklist (do this before presenting)
- [ ] Backend (`npm run dev` in `backend`) and frontend (`npm run dev` in `frontend`) running, or the Vercel link open.
- [ ] Logins from `TEST_ACCOUNTS.md` ready: `student@univoice.test` and `staff@univoice.test` (Electrical manager).
- [ ] Use an **Electrical** category so the staff account sees the issue.
- [ ] Two browser windows (one normal, one incognito) so you don't have to sign out mid-demo.
- [ ] Backup: screenshots or a short screen recording in case Wi-Fi fails.
- [ ] If AI fails live: "This is exactly why we built the manual fallback" — pick the category by hand.

---

## Part 3 — Likely questions and answers

**Why not just use Google Forms or WhatsApp?**
No routing, no deadlines, no duplicate merging, no privacy, no analytics. Forms collect data; UniVoice gets the problem fixed.

**What if the AI is wrong?**
It only suggests; the student reviews it and the manager can change the category. We log when students override the AI, so we can measure and improve it.

**What if the AI service goes down?**
The form falls back to manual entry automatically. The app never depends on the AI to work.

**How do you stop fake or spam reports?**
Accounts are required, sign-ups and AI calls are rate-limited, and the duplicate check keeps repeats out. A college can restrict sign-up to its own email domain.

**Can staff find out who complained?**
No. Reporter identity is blocked at the database level (RLS), not just hidden on screen.

**How do you make money?**
Yearly subscription per campus (per student), free pilot first, plus setup and add-ons. Running cost per campus is low, so margins are high.

**What was the hardest part technically?**
Enforcing the rules safely in the database — the status workflow trigger, RLS so staff can't see reporters, and signing AI suggestions so they can't be forged.

**How does it scale?**
Supabase PostgreSQL and Vercel serverless scale automatically; each campus is just more rows and departments.

---

**Fill in before presenting:** your names, college, date, contact/live link on the cover and last slide, the price in the Campus plan, and an optional market-size number (with its source) on the Market slide.
