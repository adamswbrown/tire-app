# E2E Testing for TIREApp

## Overview
End-to-end tests for TIREApp using Playwright. These tests verify critical user journeys and application functionality.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

## Test Coverage

### Authentication Flow
- Home page display for unauthenticated users
- Unauthorized access protection
- Sign-in link availability

### Note on Auth Testing
Tests for authenticated flows (customer creation, admin panel, etc.) require a working Auth.js session with Microsoft Entra ID. In a production CI/CD pipeline, these would be:
1. Run against a staging environment with test credentials
2. Use session mocking via NextAuth's test utilities
3. Bypass auth checks in test mode

Current tests focus on:
- Unauthenticated user flows
- Page structure and rendering
- Client-side interactions (mocked API responses)

### Future Enhancements
- [ ] Integration with test Entra ID tenant
- [ ] Session persistence helpers
- [ ] Visual regression testing
- [ ] Performance testing with Lighthouse
- [ ] Accessibility testing with axe-core

## Configuration
- `playwright.config.ts` - Main configuration
- `.env.test` - Test environment variables
- `e2e/helpers/` - Test utilities and mocks
