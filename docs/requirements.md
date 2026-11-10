# Requirements

## Problem statement

On university campuses, physical infrastructure failures (broken laboratory equipment, power outages, hydraulic leaks, and damaged classroom fixtures) frequently suffer from delayed resolution, misrouted departmental assignments, lack of student visibility, and duplicate problem reporting. Facilities management teams lack unified real-time triage, SLA breach escalation tracking, and direct field dispatch capabilities, resulting in extended downtime and campus dissatisfaction.

UniVoice solves this by providing a unified, privacy-first incident reporting and operations platform. It combines student self-service reporting with automated AI triage (category, department, and SLA priority suggestions), duplicate detection, anonymous reporter protection, strict departmental role-based access control (RLS), and manager-to-technician dispatch with automatic SLA escalation.

## Users

1. **Student / Reporter (`user`)**: Students and campus staff who encounter physical facility problems. They report issues, attach evidence photos, join existing duplicate reports to show collective impact, and track ticket resolution transparently while their identities remain strictly anonymous to operational staff.
2. **Department Facilities Manager (`admin`)**: Departmental supervisors (e.g., Electrical, HVAC, Plumbing) who triage incoming work orders, inspect auto-escalated overdue issues violating SLA deadlines, manage duty rosters, and assign specific field technicians with instructions.
3. **Field Technician (`technician`)**: Specialized campus tradespeople (electricians, hydraulic mechanics, AV specialists) assigned to physical work orders with live zone tracking, radio channels, and handover notes.
4. **Campus Security & Emergency Dispatch**: First responders who receive immediate panic/critical alerts and direct student communications for safety hazards.

## Functional requirements

| ID | Requirement | Priority (Must / Should / Stretch) | Status |
|----|-------------|------------------------------------|--------|
| FR-01 | Student issue submission with location (campus building & room), description, and optional photo attachment | Must | Done |
| FR-02 | AI-assisted triage suggesting issue category, responsible department, and SLA priority (High 24h, Medium 72h, Low 7d) | Must | Done |
| FR-03 | Student manual override allowing users to bypass AI or edit suggested category/priority before saving | Must | Done |
| FR-04 | Cryptographic signing of AI suggestions (HMAC SHA-256) to prevent client-side token spoofing or privilege tampering | Must | Done |
| FR-05 | Real-time duplicate detection alerting reporters to existing open issues in the same area with one-click "I have this issue too" joining | Must | Done |
| FR-06 | Departmental Manager Portal displaying real-time SLA metrics, open work orders, overdue/escalation queues, and status workflows | Must | Done |
| FR-07 | Strict state machine lifecycle transitions (`open → in_progress → resolved → closed`) with mandatory reason notes on regressions or closures | Must | Done |
| FR-08 | Technical team management & dispatch: assigning specific on-duty technicians with active workload tracking and radio dispatch notes | Should | Done |
| FR-09 | Reporter anonymity: staff inspect ticket notes and supporter counts but can never access personal student IDs or identities | Must | Done |
| FR-10 | Direct Emergency Hotline & Dispatch screen with instant one-click calling for severe campus hazards | Should | Done |
| FR-11 | Real-time dynamic password strength validation on signup enforcing uppercase, number, special character, and 8+ characters | Should | Done |

## Non-functional requirements

| ID | Category | Requirement | Target | How measured | Result |
|----|----------|-------------|--------|--------------|--------|
| NFR-01 | Performance | API response time for issue listings and triage queries | < 300 ms | Server execution timing & client network benchmarks | ~120 ms avg |
| NFR-02 | AI Latency | AI classification turnaround with model fallback | < 3.0 s | End-to-end `POST /api/ai/classify` response timer | ~1.4 s with Gemini |
| NFR-03 | Security | Reporter identity isolation in database layer | 0 leaks | Row-Level Security (RLS) policies and `security_invoker` views | Verified via SQL audit |
| NFR-04 | Resilience | Graceful degradation when AI API is unavailable or rate-limited | 100% operational | Disable AI key or toggle `/api/ai/toggle`; submit issue | Zero downtime; auto manual mode |
| NFR-05 | Usability | Judge/new user onboarding & issue reporting flow | < 3 minutes | Timed walkthrough by evaluator on clean browser session | 1 min 45 s |
| NFR-06 | Bundle Size | Optimized production asset size for mobile campus connectivity | < 250 kB gzipped JS | Vite build output measurement | 163.78 kB gzip |

## Constraints

1. **Zero Database Credential Leaks**: Supabase service role keys are strictly quarantined in backend server environments; browser client uses only public anon keys with Row-Level Security.
2. **Read-only Serverless Filesystem**: Persistent temporary data on Vercel deployment must reside under `/tmp` to avoid runtime `EROFS` write restrictions.
3. **Database Guard Triggers**: Status transitions and ticket integrity are protected by PostgreSQL trigger functions that cannot be subverted even if the API layer is bypassed.

## Assumptions

1. The university campus network provides HTTPS internet access for students and facility teams.
2. Departmental managers have designated departmental accounts created or promoted via database profiles.
3. Campus buildings and service categories are seeded into PostgreSQL catalog tables.

## Out of scope

1. In-app real-time VoIP audio calls (integrated via campus security direct phone dialing instead).
2. Physical inventory parts warehouse purchasing system (field technicians log work orders and status).
