# Loki Continuity - TIREApp Migration

## Current State
- **Phase**: POST-MIGRATION - Production ready iteration 14 ✅
- **Last Action**: Client-side ETag caching, integration tests, performance benchmarks, monitoring dashboard
- **Git HEAD**: c94c715 (Monitoring dashboard)
- **Next Action**: Additional improvements (E2E tests for caching, analytics dashboard, user activity tracking)

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
- E2E testing with Auth.js requires proper AUTH_SECRET env var - without it, protected routes cause ERR_TOO_MANY_REDIRECTS
- Playwright E2E tests should handle redirect loops gracefully with try/catch for auth-protected routes
- When adding rate limiting to routes that had no request parameter (e.g. `GET()`), update to `GET(request: NextRequest)` and update ALL test call sites to pass `new NextRequest(url)`
- Mock `@/lib/rate-limit` in ALL API test files that import routes using rate limiting
- Zod v4 uses `issues` not `errors` property on ZodError - use `error.issues.map()` not `error.errors.map()`
- Zod v4 `z.record(z.any())` crashes on objects - use `z.object({}).passthrough()` instead for accepting arbitrary objects
- Zod `.trim()` must come BEFORE `.min(1)` to reject whitespace-only strings (`.min(1).transform(trim)` won't catch them)
- When Prisma expects `InputJsonValue`, cast Zod-inferred union types with `as Prisma.InputJsonValue`
- `.next` build cache can corrupt Jest - delete `.next/` if all tests suddenly fail with Babel parse errors
- `npx jest` may pick up global jest (v30) instead of project jest - use `node_modules/.bin/jest` for reliability
- `JSON.stringify(undefined)` returns `undefined` (not a string) - use `?? ''` fallback for crypto.update()
- PrismaNeon adapter internally creates neon Pool from config object - pass pool options directly to PrismaNeon constructor

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
- M11 E2E Testing Setup: COMPLETE (651c779 - Playwright infrastructure, 8 smoke tests)
- M12 Deployment Config: COMPLETE (e7f2f8c - Vercel config, docs, README, .env.example)
- M13 Security Headers: COMPLETE (876fed8 - CSP, XSS protection, clickjacking prevention)
- M14 Performance Monitoring: COMPLETE (47f671f - Prisma logging, API timing utilities)
- M15 Rate Limiting + Health: COMPLETE (ef0ca94 - rate limiter, /api/health, rate limit on customers/upload/export)
- M16 Input Sanitization: COMPLETE (1b57191 - HTML stripping, sanitizeName utility)
- M17 Edge Case Tests: COMPLETE (a64651e - 9 error handling tests for applications API)
- M18 Full Rate Limiting: COMPLETE (35832b6 - rate limiting on all API routes)
- M19 Zod Validation + Pagination: COMPLETE (fa001dd - Zod schemas, API pagination, PATCH/DELETE rate limiting)
- M20 Structured Logging + Timing: COMPLETE (ffe7d58 - structured logger, middleware X-Response-Time)
- M21 Search + Sort + Filter: COMPLETE (2a89b8e - customer search, app sort/filter, pagination params)
- M22 Request Tracing + API Types: COMPLETE (007ec2a - X-Request-Id header, shared API types)
- M23 ETag Caching + API Errors: COMPLETE (6387711 - conditionalResponse, api-errors module, 27 tests)
- M24 OpenAPI Spec: COMPLETE (6992d65 - /api/docs endpoint, full schema, 9 tests)
- M25 Connection Pooling: COMPLETE (55d883a - PrismaNeon pool config, DB_POOL_SIZE env)
- M26 CORS Headers: COMPLETE (c5f9066 - origin-restricted CORS in middleware)
- M27 TypeScript Strict: COMPLETE (17dadde - zero tsc errors, test type fixes)
- M28 Client-Side Caching: COMPLETE (098a640 - apiFetch utility, component refactor, 9 tests)
- M29 Integration Tests: COMPLETE (3b31200 - API caching integration tests, 14 tests)
- M30 Performance Benchmarks: COMPLETE (fa2d592 - caching benchmarks, 10 tests, 117k req/s)
- M31 Monitoring Dashboard: COMPLETE (c94c715 - health monitoring component, 13 tests)

## Test Coverage (350 tests, 35 suites)
- **API Routes (9 suites, 84 tests)**: customers, applications (inc pagination), applications/[id], applications-edge (9), questionnaires, thresholds, users, upload (7), export (7), health (4)
- **Components (11 suites, 77 tests)**: ExportButton, ThresholdManager, CustomerActions, UserManager, ApplicationTable, ExcelUpload, ErrorBoundary/Loading/NotFound, ApplicationDetail (7), StrategyQuestionsForm (10), AppQuestionsForm (17), MonitoringDashboard (13)
- **Lib (9 suites, 129 tests)**: TIRE Scoring (18), Excel Parser (6), Rate Limiter (6), Sanitize (13), Validations (34), Logger (10), API Cache (17), API Errors (10), API Client (9)
- **Pages (2 suites, 6 tests)**: HomePage (3), UnauthorizedPage (3)
- **Schema (1 suite, 9 tests)**: Prisma schema validation
- **OpenAPI (1 suite, 9 tests)**: Spec validation
- **Integration (1 suite, 14 tests)**: API ETag caching integration
- **Performance (1 suite, 10 tests)**: Caching benchmarks (117k req/s throughput)
- **E2E (1 suite, 8 tests)**: Smoke tests (home page, sign-in, route protection, accessibility, console errors, responsive)

## Performance Improvements (Iteration 3+6)
- [x] useMemo on filtered lists: ApplicationTable, StrategyQuestionsForm, AppQuestionsForm
- [x] useMemo on computed values: answeredCount, visibleQuestions, totalQuestions
- [x] useCallback on event handlers: updateAnswer, updateExtended, handleSave in forms
- [x] Loading boundaries: admin, applications list, app detail route segments
- [x] Error boundaries: admin, applications list, app detail route segments
- [x] ETag conditional responses on all GET endpoints (304 Not Modified)
- [x] Cache-Control headers (5-min max-age for thresholds)
- [x] Neon connection pooling (10 max, 30s idle timeout, 10s connect timeout)

## Security Improvements (Iterations 2+4+6)
- [x] Input validation: customer/app names max 500 chars
- [x] 404 guards: PATCH/DELETE check record exists before operating
- [x] Range validation: thresholds must be 0-100
- [x] Error handling: try/catch on all API routes (prevents stack trace leaks)
- [x] RBAC enforcement: admin-only routes return 403 for non-admins
- [x] Rate limiting: sliding window per-IP (60/min reads, 20/min writes, 10/min uploads)
- [x] Input sanitization: HTML tag stripping on all name inputs
- [x] Security headers: CSP, X-Frame-Options, X-Content-Type-Options
- [x] CORS: origin-restricted, exposes ETag/X-Request-Id/X-Response-Time

## API Improvements (Iteration 6+7)
- [x] OpenAPI 3.1 spec at /api/docs
- [x] Standardized error codes (ApiErrorCode enum)
- [x] ETag-based conditional responses (server-side)
- [x] Client-side ETag caching with apiFetch utility
- [x] CORS configuration in middleware
- [x] Performance benchmarks (117k req/s, 304 responses 2.83x faster)
- [x] Integration tests for caching behavior

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

## Routes (20 total)
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
- /api/health
- /api/docs (OpenAPI spec)

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
- ETag-based conditional responses for efficient client caching
- OpenAPI 3.1 spec for API documentation and contract
- Neon connection pool with configurable size (DB_POOL_SIZE env)
- Client-side fetch utility (apiFetch) with automatic ETag caching
- Monitoring dashboard component with auto-refresh capabilities
- Comprehensive performance benchmarks validating sub-millisecond latencies
