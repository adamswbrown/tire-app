# Migration Plan (Electron -> Web on Vercel)

## Scope and Goals
- Preserve all existing functionality exactly (imports, questionnaires, scoring, exports).
- Move storage from local filesystem/electron-store to Postgres + Vercel Blob.
- Single-tenant Entra ID authentication with Consultant/Admin roles.
- Maintain DrM import/export support while positioning as a Gartner TIRE helper.

## Assumptions
- Hosting: Vercel (Next.js App Router).
- Database: Vercel Postgres.
- Storage: Vercel Blob.
- XLSX size: 100–1000 rows (serverless feasible, but design for scale).

## Milestones

### 1) Foundation and Authentication
**Outcomes**
- Next.js App Router project scaffolded.
- Entra ID OIDC login with Auth.js (single tenant).
- User table with role mapping (Consultant/Admin).

**Tasks**
- Create Next.js app and environment config.
- Set up Auth.js provider for Entra ID.
- Implement session guards for protected pages.
- Persist user profile + role to Postgres on first login.

**Acceptance Criteria**
- Consultant can sign in and reach the app.
- Admin can sign in and access admin-only pages.

### 2) Data Model + Core APIs
**Outcomes**
- Postgres schema in place.
- CRUD APIs for customers, apps, and answers.

**Tasks**
- Create tables: users, customers, uploads, applications, app_questions, strategy_questions, thresholds.
- Implement API routes or server actions for:
  - customers (create/list)
  - apps (list by customer)
  - app questions (save/load)
  - strategy questions (save/load)

**Acceptance Criteria**
- Answer data persists and loads for the same app across sessions.

### 3) Upload + Parse Pipeline
**Outcomes**
- XLSX upload to Vercel Blob.
- Parse and normalize app list into Postgres.

**Tasks**
- Build signed-upload endpoint.
- Store upload metadata in Postgres.
- Parse XLSX on server and upsert applications.
- Preserve dedupe/filters and required/optional column logic.

**Acceptance Criteria**
- Uploading a valid XLSX populates the app list correctly.
- Error handling mirrors Electron behavior for missing required columns.

### 4) Questionnaire UI Port
**Outcomes**
- Existing UI flows work via API calls (no IPC).

**Tasks**
- Replace Electron IPC in `start.js`, `renderer.js`, `app-questions.js`, `strategy-questions.js` with HTTP/API calls.
- Implement data hydration for app list, status, and saved answers.
- Keep scoring logic consistent with current JS logic.

**Acceptance Criteria**
- Completing app questions and strategy questions behaves as in Electron.

### 5) Export Parity
**Outcomes**
- Exports match existing XLSX/CSV outputs.

**Tasks**
- Port template-based XLSX export for completed apps.
- Port CSV export for app questions.
- Stream downloads from Blob.
- Verify formatting, columns, and values match.

**Acceptance Criteria**
- Exports match Electron outputs for identical input data.

### 6) Admin + Thresholds
**Outcomes**
- Admin settings mirror Electron functionality.

**Tasks**
- Implement thresholds persistence in DB.
- Admin UI for editing thresholds.
- Ensure thresholds apply to scoring exactly as before.

**Acceptance Criteria**
- Admin can update thresholds and see them applied in scoring.

### 7) Validation and Rollout
**Outcomes**
- Parity tests passed.
- UAT complete.

**Tasks**
- Run parity test plan across imports, scoring, and exports.
- Fix diffs until parity is achieved.
- Define cutover/launch plan.

**Acceptance Criteria**
- Parity suite passes and stakeholders approve.

## Effort and Timeline (Rough)
- Foundation + Auth: 1–2 weeks
- Data model + APIs: 1 week
- Upload/parse: 1–2 weeks
- UI port: 2–3 weeks
- Export parity: 1–2 weeks
- Admin/thresholds: 1 week
- Validation/UAT: 1 week

Total: ~7–12 weeks depending on team size and parity gaps.

## Open Decisions
- Background job strategy if XLSX sizes grow beyond 1k rows.
- Final storage strategy for exports (retain vs. regenerate on demand).
- Long-term multi-tenancy needs.

## Checklist (Milestones for AI Agent)
- [ ] M1: Foundation and Authentication complete.
- [ ] M2: Data model + core APIs complete.
- [ ] M3: Upload + parse pipeline complete.
- [ ] M4: Questionnaire UI port complete.
- [ ] M5: Export parity complete.
- [ ] M6: Admin + thresholds complete.
- [ ] M7: Validation and rollout complete.
