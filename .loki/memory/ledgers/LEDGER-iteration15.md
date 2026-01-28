# Iteration 15 Ledger - Quality Fixes & Database Indexes

## Summary
Fixed critical component bugs (MonitoringDashboard, AnalyticsDashboard, Health API), added database indexes for performance, upload file validation, and AnalyticsDashboard tests.

## Completed Tasks

### 1. Health API Enhancement (cfb628c)
- Restructured response: `database: string` -> `database: { connected: boolean, latency?: number }`
- Added memory usage reporting via `process.memoryUsage()` and `os.totalmem()`
- Added database latency measurement via `performance.now()`
- Status values changed: `ok` -> `healthy`, `degraded` -> `unhealthy`
- Updated 5 health tests to match new response format

### 2. MonitoringDashboard Fixes (cfb628c)
- Fixed React hooks violation: `fetchHealth` accessed before declaration in useEffect
- Converted `fetchHealth` to `useCallback` with proper dependency array
- Removed unused `CacheStats` interface
- Removed `console.log` debug statement
- Added `fetchHealth` to useEffect dependency array

### 3. AnalyticsDashboard Fixes (cfb628c)
- Fixed broken API call: `/api/applications` requires `customerId` but component omitted it
- Made `customerId` optional in applications GET route (returns all apps when omitted)
- Fixed response handling: API returns `{ data: [...], pagination: {...} }`, not flat array
- Updated test: changed "returns 400 when customerId missing" to "returns all applications when customerId omitted"

### 4. Database Indexes (cfb628c)
- `Customer.name` - for search queries with `contains` filter
- `Application.customerId` - FK used in every application query
- `Application.status` - used in filtering
- `Application.customerId + status` - composite for common query pattern
- `AssessmentHistory.applicationId` - FK with frequent lookups
- `AssessmentHistory.createdAt` - for orderBy queries

### 5. File Upload Validation (cfb628c)
- 10MB file size limit
- Excel-only MIME type check (xlsx, xls)
- Fallback to extension check if MIME type missing

### 6. Code Quality Fixes (cfb628c)
- Removed unused `_fi` parameter in StrategyQuestionsForm
- All TypeScript errors: 0
- All tests: 362 passing, 36 suites

### 7. AnalyticsDashboard Tests (cfb628c)
- 11 new tests covering: loading, data display, completion stats, TIRE placements, scope breakdown, customer summary, error state, retry, refresh, recent activity, empty data

## Test Results
- **362 tests passing** (was 350)
- **36 suites** (was 35)
- **Zero TypeScript errors**
- **Zero ESLint critical issues**

## Learnings
- API response shape mismatches between client and server are a common source of runtime crashes
- React useEffect with function declarations before the function is defined works due to hoisting, but is fragile and causes ESLint errors - always use useCallback
- Database indexes should be added early for FK columns and commonly filtered/sorted fields
- File upload routes should always validate type and size before processing
