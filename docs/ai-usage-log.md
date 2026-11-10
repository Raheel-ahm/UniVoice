# AI Usage Log

Required by the event rules. Log every meaningful use of AI tools during the build.

## Tools used

| Tool | Used for |
|------|----------|
| **Antigravity AI (DeepMind Assistant)** | Architecture design, full-stack debugging, automated test authoring, Vercel deployment unification, UI refactoring |
| **Google Gemini API (`gemini-2.5-flash`)** | Runtime product feature: real-time natural language triage, category prediction, department routing, and priority estimation |
| **Anthropic Claude (`claude-opus-5-5`)** | Secondary classification fallback engine for issue analysis |

## Log

| Time | Member | Tool | What it was asked | What was accepted / changed / rejected | How it was verified |
|------|--------|------|-------------------|----------------------------------------|---------------------|
| 10:45 AM | Raheel Ahmad | Antigravity | Analyze project schema, PostgreSQL triggers, and connect frontend to backend | Accepted full architectural scaffolding; added strict Zod schemas | Verified API endpoints with curl and browser test |
| 11:30 AM | Raheel Ahmad | Antigravity | Implement real-time AI classification with cryptographic suggestion tokens | Accepted HMAC SHA-256 signing pattern to safeguard against client manipulation | Unit tests in `suggestionToken.test.js` |
| 12:15 PM | Raheel Ahmad | Antigravity | Diagnose port 4000 already in use and resolve server startup collisions | Accepted process termination commands and safe port guards | Server started successfully |
| 01:20 PM | Raheel Ahmad | Antigravity | Refactor UI scaling at 100% resolution and polish Emergency Dispatch screen | Accepted CSS fixes, reduced card padding, and aligned dashboard layouts | Verified visually in browser across resolution tiers |
| 02:05 PM | Raheel Ahmad | Antigravity | Implement dynamic password requirement checklist (8+ chars, uppercase, number, symbol) | Accepted live 4-point dynamic checklist; rejected native browser validation bubbles | Interactive testing on signup vs login forms |
| 02:40 PM | Raheel Ahmad | Antigravity | Enable managers to assign physical work orders to technical team members | Accepted duty roster, technician workload tracking, and dispatch endpoints | Dispatched work order to technician and verified state persistence |
| 03:00 PM | Raheel Ahmad | Antigravity | Fix modal layout overflowing viewport on task assignment screen | Accepted compact dialog redesign (`max-height: 88vh`, styled selector) | Rendered without overflow on 100% zoom |
| 03:15 PM | Raheel Ahmad | Antigravity | Configure unified deployment on Vercel for both Vite frontend and Express API | Accepted `vercel.json` rewrite strategy with single build command and dynamic CORS | Full build `npm run build` executed and verified |

## Reflection

### Where AI helped most

1. **Rapid Architectural Scaffolding**: Generated complete cryptographic token signing, database Row-Level Security rules, and state machine transition guards in minutes.
2. **Defect Diagnosis & CSS Refinement**: Swiftly resolved complex CSS viewport overflow issues and eliminated browser-native tooltip popups in favor of polished inline dynamic checklists.
3. **Seamless Deployment Setup**: Engineered a single-command unified deployment pipeline combining a Vite React client and an Express Node.js server into a single Vercel serverless application.

### Where AI was wrong or misleading

1. **Modal Viewport Calculations**: The initial modal layout generated for technical team assignment rendered a long vertical list of all technicians simultaneously, which overflowed the bottom of the viewport on 100% display scaling. This was corrected by switching to a compact dropdown selector with an interactive live preview card.
2. **Serverless Filesystem Assumption**: Initial file-based technician assignment persistence assumed a persistent writable local disk directory, which would fail on Vercel's read-only serverless filesystem. This was corrected by dynamically writing to `/tmp/univoice-data/` when running in a serverless environment.

### What we did not delegate to AI

1. **Database Credentials & Environment Secrets**: All Supabase keys, JWT configurations, and production environment variables were kept strictly confidential and isolated.
2. **Core Domain Rules & Workflow Logic**: The exact state machine transitions (`open → in_progress → resolved → closed`) and mandatory handover note requirements were deliberately designed based on real campus operations needs rather than delegated to AI assumptions.
3. **Manual Override Agency**: Ensuring that students and facility managers always retain 100% manual agency to override, edit, or bypass AI suggestions at any point.

