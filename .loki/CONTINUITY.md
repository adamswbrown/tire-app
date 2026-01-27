# Loki Continuity - TIREApp Migration

## Current State
- **Phase**: M6 - Final Polish & Deployment Prep
- **Last Action**: Committed M5 (app detail page, loading states, tests)
- **Git HEAD**: 062ec40 (M5 committed)
- **Next Action**: Navigation polish, not-found pages, dashboard improvements

## Mistakes & Learnings
- Previous session committed M1 scaffold but directory was deleted from disk afterward
- Always verify working tree matches git state before starting work
- Prisma v7 requires PrismaNeon adapter with PoolConfig (not neon() function)
- Auth.js database sessions use {session, user} callback, not {session, token}
- XLSX library: empty arrays [] are collapsed, use [''] for placeholder rows
- TypeScript JSON imports need `as never[]` or `as unknown` casts for strict types

## Progress
- M1 Foundation: COMPLETE (7b0a6e9 - build fixes, 7d806a6 - tests)
- M2 Data Model: COMPLETE (8bd4c78 - schema, APIs, TIRE scoring)
- M3 UI: COMPLETE (8774222 - Excel upload, questionnaires, navigation)
- M4 Export + Admin: COMPLETE (d4e7027 - export API, export button, admin thresholds)
- M5 Polish + Tests: COMPLETE (062ec40 - app detail, loading, error boundary, 39 tests)
- M6 Final Polish: IN PROGRESS

## Test Coverage
- 39 tests passing across 7 suites
- HomePage (3), UnauthorizedPage (3), Schema (9), TIRE Scoring (12), Excel Parser (6)
- ExportButton (4), ThresholdManager (4)

## Architecture Decisions
- Fresh /tireapp-web subdirectory for isolation from Electron app
- Auth.js v5 beta with Microsoft Entra ID
- Neon Postgres with Prisma ORM + PrismaNeon adapter
- Database sessions (not JWT-only) for enterprise security
- Lazy Proxy-based Prisma singleton for build-time compatibility
- Question JSON data stored as static files in lib/
- TIRE scoring ported as TypeScript module with full type safety
- Excel export generates multi-sheet workbook (summary, scores, answers)
- Admin threshold management via client-side fetch to API
- Application detail page with inline editing and delete
