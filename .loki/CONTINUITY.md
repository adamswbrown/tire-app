# Loki Continuity - TIREApp Migration

## Current State
- **Phase**: POST-MIGRATION - Quality hardening iteration 4
- **Last Action**: Component + API test expansion (177 tests, 22 suites)
- **Git HEAD**: 098d9f0 (upload/export API tests committed)
- **Next Action**: E2E test setup, deployment config, or additional hardening

## Mistakes & Learnings
- Previous session committed M1 scaffold but directory was deleted from disk afterward
- Always verify working tree matches git state before starting work
- Prisma v7 requires PrismaNeon adapter with PoolConfig (not neon() function)
- Auth.js database sessions use {session, user} callback, not {session, token}
- XLSX library: empty arrays [] are collapsed, use [''] for placeholder rows
- TypeScript JSON imports need `as never[]` or `as unknown` casts for strict types
- npx commands must run from tireapp-web/ directory, not project root
- Jest API route tests need `@jest-environment node` docblock (jsdom lacks Request/Response)
- Component named `Error` shadows global Error constructor - use `ErrorPage` alias in tests
- `getByText('In Scope')` fails when text appears in both filter buttons and table badges - use `getAllByText` and filter by tagName
- All API routes should have try/catch to prevent unhandled Prisma errors leaking stack traces
- Babel-jest in next/jest doesn't support `type` keyword in imports - use inline union types or separate type import file
- `JSON.parse(JSON.stringify())` is valid pattern for passing Prisma Date objects to client components in Next.js

## Progress
- M1 Foundation: COMPLETE (7b0a6e9 - build fixes, 7d806a6 - tests)
- M2 Data Model: COMPLETE (8bd4c78 - schema, APIs, TIRE scoring)
- M3 UI: COMPLETE (8774222 - Excel upload, questionnaires, navigation)
- M4 Export + Admin: COMPLETE (d4e7027 - export API, export button, admin thresholds)
- M5 Polish + Tests: COMPLETE (062ec40 - app detail, loading, error boundary, 39 tests)
- M6 Dashboard: COMPLETE (2345b15 - TIRE stats, not-found page)
- M7 Results + Users: COMPLETE (b750fb0 - results view, user management API)
- M8 Quality Hardening: COMPLETE (af8ef35 - tests, security, a11y, error handling)
- M9 Performance + Coverage: COMPLETE (24e105e - memoization, loading/error boundaries, edge case tests, a11y)
- M10 Component Test Expansion: COMPLETE (54283cc - ApplicationDetail, StrategyQuestionsForm, AppQuestionsForm)

## Test Coverage (177 tests, 22 suites)
- **API Routes (7 suites, 69 tests)**: customers, applications, applications/[id], questionnaires, thresholds, users, upload (7), export (7)
- **Components (10 suites, 64 tests)**: ExportButton, ThresholdManager, CustomerActions, UserManager, ApplicationTable, ExcelUpload, ErrorBoundary/Loading/NotFound, ApplicationDetail (7), StrategyQuestionsForm (10), AppQuestionsForm (17)
- **Lib (2 suites, 24 tests)**: TIRE Scoring (18 - includes 8 edge cases), Excel Parser (6)
- **Pages (2 suites, 6 tests)**: HomePage (3), UnauthorizedPage (3)
- **Schema (1 suite, 9 tests)**: Prisma schema validation

## Performance Improvements (Iteration 3)
- [x] useMemo on filtered lists: ApplicationTable, StrategyQuestionsForm, AppQuestionsForm
- [x] useMemo on computed values: answeredCount, visibleQuestions, totalQuestions
- [x] useCallback on event handlers: updateAnswer, updateExtended, handleSave in forms
- [x] Loading boundaries: admin, applications list, app detail route segments
- [x] Error boundaries: admin, applications list, app detail route segments

## Security Improvements (Iteration 2)
- [x] Input validation: customer/app names max 500 chars
- [x] 404 guards: PATCH/DELETE check record exists before operating
- [x] Range validation: thresholds must be 0-100
- [x] Error handling: try/catch on all API routes (prevents stack trace leaks)
- [x] RBAC enforcement: admin-only routes return 403 for non-admins

## Accessibility Improvements (Iterations 2+3)
- [x] ARIA labels on search inputs and file uploads
- [x] Navigation landmarks (aria-label on nav)
- [x] role="main" on content area
- [x] role="status" on dynamic messages (ExcelUpload, StrategyQuestionsForm, AppQuestionsForm, ApplicationDetail)
- [x] aria-label on strategy question selects and note inputs

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
