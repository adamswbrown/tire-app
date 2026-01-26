# TIREApp Web - Next.js 15 Migration

Milestone 1 (M1): Foundation and Authentication

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Authentication**: Auth.js v5 (NextAuth) with Microsoft Entra ID
- **Database**: Neon Postgres
- **ORM**: Prisma 6.16+
- **Hosting**: Vercel (planned)

## Prerequisites

- Node.js 20.x
- npm (or pnpm/yarn)
- Neon Postgres account: https://console.neon.tech/
- Azure AD tenant: https://portal.azure.com/

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.local.example .env.local

# Edit .env.local with your credentials
```

**Required Variables**:

- `DATABASE_URL`: Neon pooled connection URL
- `DIRECT_URL`: Neon direct connection URL (for migrations)
- `AUTH_SECRET`: Generate with `npx auth secret`
- `AUTH_MICROSOFT_ENTRA_ID_ID`: Azure AD Application (client) ID
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`: Azure AD Client Secret
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER`: Tenant-specific issuer URL
- `NEXTAUTH_URL`: Callback URL (http://localhost:3000 for dev)

### 3. Set Up Neon Database

1. Create database at https://console.neon.tech/
2. Copy connection strings to `.env.local`:
   - **Pooled URL** (with `-pooler` suffix) → `DATABASE_URL`
   - **Direct URL** (without `-pooler`) → `DIRECT_URL`

### 4. Set Up Microsoft Entra ID (Azure AD)

1. Navigate to https://portal.azure.com/
2. Go to **Microsoft Entra ID** → **App registrations** → **New registration**
3. Name: "TIREApp Web"
4. Supported account types: **Single tenant**
5. Redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
6. Click **Register**
7. Copy **Application (client) ID** → `AUTH_MICROSOFT_ENTRA_ID_ID`
8. Go to **Certificates & secrets** → **New client secret**
9. Copy secret value → `AUTH_MICROSOFT_ENTRA_ID_SECRET`
10. Copy **Directory (tenant) ID** from Overview
11. Build issuer URL: `https://login.microsoftonline.com/[tenant-id]/v2.0` → `AUTH_MICROSOFT_ENTRA_ID_ISSUER`

**Optional: Configure App Roles**

To enable Admin role assignment:

1. Go to **App roles** → **Create app role**
2. Display name: "Admin"
3. Allowed member types: "Users/Groups"
4. Value: "Admin"
5. Description: "Administrator role for TIREApp"
6. Enable
7. Repeat for "Consultant" role (optional, this is the default)
8. Go to **Enterprise applications** → Find your app → **Users and groups**
9. Assign users to roles

### 5. Run Database Migration

```bash
# Generate Prisma Client
npx prisma generate

# Run migration to create tables
npx prisma migrate dev --name init

# Verify migration
npx prisma studio
# Opens browser UI to view database tables
```

### 6. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Testing M1 Features

### Authentication Flow

1. Navigate to http://localhost:3000
2. Click "Sign In with Microsoft"
3. Complete Entra ID authentication
4. Should redirect to `/app` (protected route)
5. Verify name and role displayed

### Role-Based Access Control

**As Consultant**:
- ✅ Can access `/app/*` routes
- ❌ Cannot access `/admin/*` routes (redirects to `/unauthorized`)

**As Admin**:
- ✅ Can access `/app/*` routes
- ✅ Can access `/admin/*` routes

### Session Persistence

1. Sign in
2. Refresh page → Should stay signed in
3. Close tab, reopen → Should stay signed in (until session expires)

## Project Structure

```
tireapp-web/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (public)
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts    # Auth.js handlers
│   ├── app/
│   │   └── page.tsx            # Protected app home
│   ├── admin/
│   │   └── page.tsx            # Admin dashboard
│   └── unauthorized/
│       └── page.tsx            # Unauthorized access
├── prisma/
│   └── schema.prisma           # Database schema
├── lib/
│   └── prisma.ts               # Prisma Client singleton
├── auth.ts                     # Auth.js configuration
├── middleware.ts               # Route protection
├── .env.local                  # Environment variables (git-ignored)
├── .env.local.example          # Environment template
└── README.md                   # This file
```

## Database Schema (M1)

**Auth.js Models** (fully implemented):
- `User` - User accounts with role field
- `Account` - OAuth provider linkage
- `Session` - Database session persistence
- `VerificationToken` - Email verification

**TIREApp Models** (future-ready, empty):
- `Customer` - Customer management
- `Application` - Application assessments
- `Questionnaire` - Question/answer storage
- `Response` - Generic responses
- `Export` - Export tracking
- `Threshold` - Admin thresholds

These will be populated in M2 (Data Model + Core APIs).

## Troubleshooting

### "Too many connections" Error

**Cause**: Prisma Client instantiated multiple times in development (hot reload)

**Solution**: Already implemented via singleton pattern in `lib/prisma.ts`

### Authentication Fails

**Check**:
1. `.env.local` has correct Azure AD credentials
2. Redirect URI in Azure matches exactly: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
3. Issuer URL uses correct tenant ID (single tenant format)

**Debug**:
```bash
# View Auth.js logs
npm run dev
# Check terminal for OAuth errors
```

### Database Connection Timeout

**Cause**: Serverless cold start exceeds default timeout

**Solution**: Already configured in DATABASE_URL:
- `connect_timeout=15`
- `pool_timeout=15`

### Prisma Migration Fails

**Cause**: Using pooled URL for migration

**Solution**: Ensure `DIRECT_URL` configured (without `-pooler` suffix)

```bash
# Run migration with direct URL
npx prisma migrate dev --name init
```

## Next Steps (M2: Data Model + Core APIs)

- Implement CRUD APIs for Customer, Application, Questionnaire
- Add server actions for data mutations
- Implement automated testing (Jest + Playwright)
- Port Electron app data models to Prisma schema

## Links

- **Research**: `/migration/M1-ResearchPack.md`
- **Implementation Plan**: `/migration/M1-ImplementationPlan.md`
- **Migration Plan**: `/migration/1-migration-plan.md`
- **Electron App**: `../` (parent directory)

---

**M1 Status**: Foundation and Authentication ✅
