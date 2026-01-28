# Migration State - TIREApp (Electron → Web)

**Project**: TIREApp Migration to Next.js/Vercel
**Started**: 2026-01-26
**Current Status**: 🟡 In Progress - Pre-execution

---

## Milestone Progress

### M1: Foundation and Authentication
**Status**: ⚪ Not Started
**Outcomes**: Next.js scaffolded, Entra ID auth, role-based access
**Acceptance**: Consultant/Admin can sign in and access appropriate pages

### M2: Data Model + Core APIs
**Status**: ⚪ Not Started
**Outcomes**: Postgres schema, CRUD APIs for customers/apps/answers
**Acceptance**: Answer data persists across sessions

### M3: Upload + Parse Pipeline
**Status**: ⚪ Not Started
**Outcomes**: XLSX upload to Blob, parse to Postgres
**Acceptance**: Valid XLSX populates app list correctly

### M4: Questionnaire UI Port
**Status**: ⚪ Not Started
**Outcomes**: UI flows work via API (no IPC)
**Acceptance**: App/strategy questions behave as in Electron

### M5: Export Parity
**Status**: ⚪ Not Started
**Outcomes**: XLSX/CSV exports match Electron outputs
**Acceptance**: Exports identical for same input data

### M6: Admin + Thresholds
**Status**: ⚪ Not Started
**Outcomes**: Admin settings mirror Electron
**Acceptance**: Admin can update thresholds, see them in scoring

### M7: Validation and Rollout
**Status**: ⚪ Not Started
**Outcomes**: Parity tests passed, UAT complete
**Acceptance**: Parity suite passes, stakeholders approve

---

## Overall Progress

- **Milestones Complete**: 0/7
- **Current Phase**: Initialization
- **Blockers**: None
- **Estimated Completion**: 3-4 weeks

---

## Quality Metrics

- **ResearchPack Scores**: N/A
- **Implementation Plan Scores**: N/A
- **Test Coverage**: N/A
- **Parity Tests Passed**: 0/0

---

## Recent Completions

_None yet - migration just starting_

---

## Next Actions

1. Start Milestone 1 research (@docs-researcher)
2. Research Next.js 15 App Router + Auth.js with Entra ID
3. Create ResearchPack (target score ≥80)

---

**Legend**:
- ⚪ Not Started
- 🔵 In Progress
- 🟢 Complete
- 🔴 Blocked
- 🟡 Needs Review

---

_Last Updated_: 2026-01-26 (Initialization)
