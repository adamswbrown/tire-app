# Loki Continuity - TIREApp Migration

## Current State
- **Phase**: MIGRATION COMPLETE - All core features implemented
- **Last Action**: Committed M7 (results view, user management)
- **Git HEAD**: b750fb0 (M7 committed)
- **Next Action**: Deployment preparation or further enhancements

## Mistakes & Learnings
- Previous session committed M1 scaffold but directory was deleted from disk afterward
- Always verify working tree matches git state before starting work
- Prisma v7 requires PrismaNeon adapter with PoolConfig (not neon() function)
- Auth.js database sessions use {session, user} callback, not {session, token}
- XLSX library: empty arrays [] are collapsed, use [''] for placeholder rows
- TypeScript JSON imports need `as never[]` or `as unknown` casts for strict types
- npx commands must run from tireapp-web/ directory, not project root

## Progress
- M1 Foundation: COMPLETE (7b0a6e9 - build fixes, 7d806a6 - tests)
- M2 Data Model: COMPLETE (8bd4c78 - schema, APIs, TIRE scoring)
- M3 UI: COMPLETE (8774222 - Excel upload, questionnaires, navigation)
- M4 Export + Admin: COMPLETE (d4e7027 - export API, export button, admin thresholds)
- M5 Polish + Tests: COMPLETE (062ec40 - app detail, loading, error boundary, 39 tests)
- M6 Dashboard: COMPLETE (2345b15 - TIRE stats, not-found page)
- M7 Results + Users: COMPLETE (b750fb0 - results view, user management API)

## Test Coverage
- 39 tests passing across 7 suites
- HomePage (3), UnauthorizedPage (3), Schema (9), TIRE Scoring (12), Excel Parser (6)
- ExportButton (4), ThresholdManager (4)

## Feature Parity Checklist (vs Electron App)
- [x] Authentication (Entra ID via Auth.js)
- [x] Customer management (create, list)
- [x] Excel upload (App-to-Server List parsing)
- [x] Application management (create, edit, delete, batch import)
- [x] App Questions flow (section-based with conditional logic)
- [x] Strategy Questions flow (TIRE scoring with real-time bars)
- [x] TIRE scoring engine (distribution, tiebreak, placement)
- [x] TIRE results view (score breakdown, descriptions)
- [x] Excel export (multi-sheet: summary, scores, questions)
- [x] Admin panel (thresholds, system stats, user management)
- [x] Role-based access control (Admin, Consultant, Viewer)
- [x] Loading states and error boundaries

## Routes (18 total)
- / (home/landing)
- /unauthorized
- /admin (admin dashboard)
- /app (dashboard with TIRE stats)
- /app/customers/[id]/applications (application list)
- /app/customers/[id]/applications/[appId] (detail/edit)
- /app/customers/[id]/applications/[appId]/app-questions
- /app/customers/[id]/applications/[appId]/strategy-questions
- /app/customers/[id]/applications/[appId]/results
- /api/auth/[...nextauth]
- /api/customers
- /api/applications, /api/applications/[id]
- /api/questionnaires
- /api/thresholds
- /api/upload
- /api/export
- /api/users

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
- Results page with TIRE descriptions and visual score breakdown
- User management with role assignment in admin panel
