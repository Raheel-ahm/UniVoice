# Testing

## Test strategy

UniVoice employs a multi-tiered verification strategy spanning:
1. **Automated Unit Testing**: Native Node 22 test runner (`node:test`) verifying request validation schemas, cryptographic token creation/verification, technician assignment data structures, and state machine transitions.
2. **Integration & API Testing**: Validating authenticated endpoints, JWT verification, role-based access enforcement, and error responses.
3. **End-to-End & Manual Walkthroughs**: Full verification of the Student reporting journey, duplicate detection triggers, Manager Operations Hub triage, technician dispatch, and Emergency hotline access.
4. **Resilience Testing**: Testing zero-config degradation when AI services are offline or rate-limited.

## How to run tests

```bash
# Run backend test suite from repository root:
npm test

# Or run tests directly within backend directory:
cd backend
npm test
```

## Results summary

| Type | Total | Passed | Failed |
|------|-------|--------|--------|
| Unit (Validation, Crypto, State Machine, Assignments) | 18 | 18 | 0 |
| Integration / API endpoints | 8 | 8 | 0 |
| End-to-end / manual test scenarios | 12 | 12 | 0 |
| **Total** | **38** | **38** | **0** |

## Edge cases covered

| ID | Edge case | Expected behaviour | Test / evidence | Result |
|----|-----------|--------------------|-----------------|--------|
| EC-01 | Submission of issue title shorter than 3 characters | Rejected with `400 Bad Request` and descriptive error | `validate.test.js` | Pass |
| EC-02 | Issue description under 10 characters | Rejected with minimum length constraint warning | `validate.test.js` | Pass |
| EC-03 | Tampered suggestion token signature | Rejected by HMAC validation; fails gracefully to manual mode | `suggestionToken.test.js` | Pass |
| EC-04 | User attempting to use another student's suggestion token | Token decoding detects mismatched `userId` and rejects | `suggestionToken.test.js` | Pass |
| EC-05 | Illegal status progression (e.g., jumping from `resolved` back to `open`) | State machine rejects illegal transition | `statusWorkflow.test.js` | Pass |
| EC-06 | Direct closure of open issue (`open → closed`) without resolution | Allowed only with required explanatory note | `statusWorkflow.test.js` & trigger | Pass |
| EC-07 | AI service outage or missing API key during reporting | UI prompts user with manual category/priority selection without blocking | Manual mode fallback verified | Pass |
| EC-08 | Duplicate issue in same building & room submitted by another student | Triggers modal prompt to join ticket instead of creating duplicate | Tested in ReportIssue.jsx flow | Pass |

## Measured metrics

| Metric | Method | Result |
|--------|--------|--------|
| Test suite execution duration | Node 22 native test runner timer | 278 ms |
| Frontend production build time | Vite build benchmarking | 555 ms |
| Frontend bundle size (gzip) | Vite production asset reporter | 163.78 kB |
| API classification latency | Gemini 2.5 Flash API benchmark | 1.42 s avg |
| Manager dashboard triage load time | Supabase PostgreSQL query timing | 85 ms |

## Defect log

| ID | Description | Found by / how | Severity | Status | Fix commit |
|----|-------------|----------------|----------|--------|------------|
| D-01 | Port 4000 collision on local backend restart | Local developer test runs | Medium | Fixed | Port cleanup & reuse handling |
| D-02 | Signup password validation showing browser popup tooltips instead of clean UI | UI inspection on Signup page | Low | Fixed | Replaced native tooltips with 4 live checking checklist items |
| D-03 | Manager task assignment modal overflowing viewport on standard 100% resolution | Evaluator screenshot inspection | High | Fixed | Redesigned into compact 540px responsive dialog with scroll bounds |
| D-04 | Hardcoded placeholder email in manager login input | Evaluator review | Low | Fixed | Removed placeholder text from manager email input |
| D-05 | Student unable to manually assign category/priority when desired | Feature review | Medium | Fixed | Added manual mode toggle and manual priority/category cards |
| D-06 | Serverless filesystem read-only crash on Vercel | Vercel build inspection | High | Fixed | Dynamically routed local storage to `/tmp` on serverless runtime |

## Known untested areas

- Web push notifications for mobile devices when a work order changes status (currently tracked via in-app live status timeline).
- Automatic batch PDF exporting of monthly facilities reports (scheduled for next sprint).

