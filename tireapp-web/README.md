# TIREApp Web Application

Modern web application for TIRE (Technology, Infrastructure, Risk, Environment) assessment and scoring.

## Overview

TIREApp helps organizations evaluate applications across four key dimensions:
- **T**echnology: Technical capabilities and architecture
- **I**nfrastructure: Hosting and operational requirements
- **R**isk: Security and compliance considerations
- **E**nvironment: Business and organizational fit

## Features

✅ **Authentication & RBAC**
- Microsoft Entra ID (Azure AD) integration
- Role-based access control (Admin, Consultant, Viewer)
- Database sessions for enterprise security

✅ **Customer & Application Management**
- Multi-tenant customer support
- Excel bulk import from "App-to-Server List"
- Individual application creation and editing
- Scoping workflow (In Scope, Not In Scope, Pending)

✅ **Assessment Workflows**
- **App Questions**: Section-based questionnaire with conditional logic
- **Strategy Questions**: TIRE category scoring with real-time visualization
- **TIRE Scoring Engine**: Automated calculation with distribution and tiebreak logic

✅ **Results & Reporting**
- TIRE score breakdown by category
- Placement recommendations (Retire, Tolerate, Invest, Eliminate)
- Multi-sheet Excel export (summary, scores, answers)

✅ **Admin Panel**
- Customizable TIRE thresholds
- System statistics dashboard
- User management with role assignment

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 7 with PrismaNeon adapter
- **Authentication**: Auth.js v5 (NextAuth)
- **Testing**: Jest (177 unit/integration), Playwright (8 E2E)
- **Deployment**: Vercel

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or Neon)
- Microsoft Entra ID app registration

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm test            # Run Jest tests (177 tests)
npm run test:watch  # Run tests in watch mode
npm run test:e2e    # Run Playwright E2E tests (8 tests)
npm run test:e2e:ui # Run E2E tests in UI mode
npm run lint        # Run ESLint
```

### Project Structure

```
tireapp-web/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (REST endpoints)
│   ├── app/               # Protected application routes
│   ├── admin/             # Admin panel
│   └── unauthorized/      # Access denied page
├── components/            # React components
├── lib/                   # Shared utilities
│   ├── questions/         # Question data (JSON)
│   ├── tire-scoring.ts    # TIRE calculation engine
│   └── excel-parser.ts    # Excel import logic
├── prisma/               # Database schema and migrations
├── __tests__/            # Jest tests (unit + integration)
├── e2e/                  # Playwright E2E tests
└── public/               # Static assets
```

## Testing

### Unit & Integration Tests (Jest)
```bash
npm test
```

**Coverage**: 177 tests across 22 suites
- API routes (7 suites, 69 tests)
- Components (10 suites, 64 tests)
- Business logic (2 suites, 24 tests)
- Pages (2 suites, 6 tests)
- Schema validation (1 suite, 9 tests)

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

**Coverage**: 8 smoke tests
- Home page loading
- Authentication flow
- Route protection
- Accessibility checks

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Environment Variables

Required variables (see `.env.example`):

```env
# Database
DATABASE_URL="postgresql://..."

# Auth.js
AUTH_SECRET="..."
AUTH_MICROSOFT_ENTRA_ID_ID="..."
AUTH_MICROSOFT_ENTRA_ID_SECRET="..."
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID="..."
NEXTAUTH_URL="http://localhost:3000"
```

## Architecture Decisions

### Why Next.js App Router?
- Server components for optimal performance
- Built-in API routes with type safety
- Edge middleware for authentication
- Streaming and React Suspense support

### Why Prisma + Neon?
- Type-safe database queries
- Automatic migrations
- Serverless-optimized connection pooling
- Modern developer experience

### Why Auth.js v5?
- First-class Next.js integration
- Database sessions (vs JWT-only)
- Microsoft Entra ID provider
- Edge runtime compatible

## Database Schema

Key entities:
- **User**: Authentication and RBAC
- **Customer**: Multi-tenant organization
- **Application**: Assessed application with TIRE score
- **Threshold**: Configurable TIRE placement boundaries

See `prisma/schema.prisma` for complete schema.

## API Endpoints

```
POST   /api/customers              # Create customer
GET    /api/customers              # List customers
POST   /api/applications           # Create application
GET    /api/applications           # List applications
PATCH  /api/applications/[id]      # Update application
DELETE /api/applications/[id]      # Delete application
GET    /api/questionnaires         # Get question definitions
POST   /api/upload                 # Bulk import from Excel
POST   /api/export                 # Export to Excel
GET    /api/thresholds             # Get TIRE thresholds
PATCH  /api/thresholds             # Update thresholds (Admin)
GET    /api/users                  # List users (Admin)
PATCH  /api/users                  # Update user role (Admin)
```

## Contributing

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Component naming: PascalCase
- API routes: kebab-case

### Testing Requirements
- Unit tests for business logic
- Integration tests for API routes
- Component tests for UI interactions
- E2E tests for critical user journeys

### Git Workflow
- Feature branches from `main`
- Descriptive commit messages
- Pull requests for review
- Atomic commits preferred

## Security

- ✅ Input validation (max lengths, range checks)
- ✅ RBAC enforcement (Admin, Consultant, Viewer)
- ✅ Security headers (CSP, XSS protection, frame denial)
- ✅ SQL injection protection (Prisma parameterized queries)
- ✅ XSS prevention (React automatic escaping)
- ✅ CSRF protection (Auth.js built-in)
- ⏳ Rate limiting (TODO: implement with Vercel Edge Config)

## Performance

- ✅ useMemo for expensive computations
- ✅ useCallback for event handlers
- ✅ Loading states with Suspense boundaries
- ✅ Error boundaries for graceful degradation
- ✅ Database query optimization (select only needed fields)
- ✅ Edge middleware for auth (low latency)

## Accessibility

- ✅ Semantic HTML (nav, main, section)
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Dynamic status announcements (role="status")
- ✅ Color contrast compliance
- ✅ Responsive design (mobile-first)

## License

Proprietary - All rights reserved

---

**Built with ❤️ using Next.js and TypeScript**
