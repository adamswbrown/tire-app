# 🗺️ Implementation Plan: M1 - Foundation and Authentication

## Summary

This plan scaffolds a fresh Next.js 15 application with App Router in the `/tireapp-web` subdirectory, implementing Microsoft Entra ID authentication via Auth.js v5, Neon Postgres database with Prisma ORM, and role-based access control middleware. The implementation creates a completely isolated web application while preserving the existing Electron app (v1.0.3) intact for parallel operation during migration.

**Key Decision**: Create new `/tireapp-web` directory rather than in-place migration to enable zero-risk rollback and side-by-side testing. Use placeholder Azure AD credentials with comprehensive `.env.local.example` documentation to enable immediate development without Azure tenant setup.

**Architecture Pattern**: Server-side authentication with database sessions (not JWT-only) to support Auth.js PrismaAdapter requirements and enable session revocation capabilities needed for enterprise security compliance.

---

## 📁 File Changes (14 files)

### New Files (14)

**1. `/tireapp-web/package.json`**
- **Purpose**: Next.js project dependencies and scripts
- **Key Dependencies**:
  - `next@latest` (15.x)
  - `next-auth@beta` (Auth.js v5)
  - `@auth/prisma-adapter`
  - `@prisma/client`, `@neondatabase/serverless`
  - `prisma` (dev dependency)
- **Estimated Lines**: ~45 lines

**2. `/tireapp-web/tsconfig.json`**
- **Purpose**: TypeScript configuration for Next.js App Router
- **Key Settings**: `"moduleResolution": "bundler"`, paths for `@/*` imports
- **Estimated Lines**: ~25 lines

**3. `/tireapp-web/next.config.ts`**
- **Purpose**: Next.js configuration (empty initially, ready for customization)
- **Estimated Lines**: ~10 lines

**4. `/tireapp-web/.env.local.example`**
- **Purpose**: Environment variable template with documentation
- **Variables**:
  - `DATABASE_URL` (Neon pooled connection)
  - `DIRECT_URL` (Neon direct connection for migrations)
  - `AUTH_SECRET` (generated via `npx auth secret`)
  - `AUTH_MICROSOFT_ENTRA_ID_ID` (Azure AD App ID)
  - `AUTH_MICROSOFT_ENTRA_ID_SECRET` (Azure AD Client Secret)
  - `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (Tenant-specific issuer URL)
  - `NEXTAUTH_URL` (Callback URL for local/production)
- **Estimated Lines**: ~30 lines with comments

**5. `/tireapp-web/prisma/schema.prisma`**
- **Purpose**: Database schema with Auth.js models + future-ready TIREApp models
- **Models**:
  - Auth.js required: `User`, `Account`, `Session`, `VerificationToken`
  - Future-ready (empty): `Customer`, `Application`, `Questionnaire`, `Response`, `Export`, `Threshold`
- **Estimated Lines**: ~120 lines

**6. `/tireapp-web/lib/prisma.ts`**
- **Purpose**: Prisma Client singleton (prevents "too many connections" in dev)
- **Exports**: `prisma` instance
- **Pattern**: Global singleton for development, fresh instance for production
- **Estimated Lines**: ~15 lines

**7. `/tireapp-web/auth.ts`**
- **Purpose**: Auth.js configuration with Microsoft Entra ID provider
- **Exports**: `auth`, `handlers`, `signIn`, `signOut`
- **Key Features**:
  - PrismaAdapter integration
  - Database session strategy
  - Role extraction from Entra ID profile (`roles` claim)
  - JWT + session callbacks for role persistence
- **Estimated Lines**: ~50 lines

**8. `/tireapp-web/middleware.ts`**
- **Purpose**: Route protection and role-based access control
- **Protected Routes**:
  - `/app/*` - Requires authentication (any role)
  - `/admin/*` - Requires Admin role
- **Redirects**:
  - Unauthenticated → `/api/auth/signin`
  - Non-admin accessing `/admin/*` → `/unauthorized`
- **Estimated Lines**: ~25 lines

**9. `/tireapp-web/app/layout.tsx`**
- **Purpose**: Root layout (required by Next.js App Router)
- **Features**: HTML structure, metadata, global styles
- **Estimated Lines**: ~25 lines

**10. `/tireapp-web/app/page.tsx`**
- **Purpose**: Landing page (publicly accessible)
- **Content**: Welcome message, sign-in link, TIREApp description
- **Estimated Lines**: ~20 lines

**11. `/tireapp-web/app/api/auth/[...nextauth]/route.ts`**
- **Purpose**: Auth.js route handler for OAuth flow
- **Exports**: GET and POST handlers from `auth.ts`
- **Estimated Lines**: ~5 lines

**12. `/tireapp-web/app/app/page.tsx`**
- **Purpose**: Protected application home (authenticated users only)
- **Features**: Display user name and role from session
- **Server Component**: Uses `auth()` for session access
- **Estimated Lines**: ~25 lines

**13. `/tireapp-web/app/admin/page.tsx`**
- **Purpose**: Admin dashboard (Admin role only)
- **Features**: Role check, admin tools placeholder
- **Server Component**: Uses `auth()` with role validation
- **Estimated Lines**: ~25 lines

**14. `/tireapp-web/app/unauthorized/page.tsx`**
- **Purpose**: Unauthorized access page (insufficient permissions)
- **Content**: Error message, link back to app home
- **Estimated Lines**: ~15 lines

### Modified Files (0)

**None** - This is a fresh project in isolated subdirectory

### Test Files (0 for M1 - manual verification only)

**Manual testing for M1 (TDD for M2+)**:
- M1 focuses on scaffolding and configuration
- Manual verification: Auth flow, role-based access, session persistence
- **Rationale**: Integration testing auth requires live Azure AD tenant
- **Future**: M2+ will implement Jest/Playwright for automated testing

---

## 🔢 Implementation Steps

### Prerequisites

- [x] ResearchPack validated (M1-ResearchPack.md, score 100/100)
- [x] Working directory confirmed: `/Users/adambrown/Developer/Altra/TIREApp`
- [ ] pnpm installed (verify: `pnpm --version`)
- [ ] Node.js 20.x installed (verify: `node --version`)
- [ ] Git repository clean (verify: `git status`)

**Checkpoint**:
```bash
# Create pre-implementation checkpoint
git add -A
git commit -m "Pre-M1 checkpoint: Before Next.js scaffold"
```

---

### Step 1: Scaffold Next.js 15 Project

**Task**: Create fresh Next.js 15 project with App Router in `/tireapp-web` subdirectory

**Commands**:
```bash
cd /Users/adambrown/Developer/Altra/TIREApp

# Create Next.js 15 with TypeScript, Tailwind, App Router
pnpm create next-app@latest tireapp-web \
  --typescript \
  --tailwind \
  --app \
  --import-alias "@/*" \
  --use-pnpm \
  --yes

# Verify scaffold success
cd tireapp-web
ls -la
```

**Expected Output**:
```
✔ Creating a new Next.js app in /Users/adambrown/Developer/Altra/TIREApp/tireapp-web
✔ Installing dependencies
✔ Initializing project

Success! Created tireapp-web at /Users/adambrown/Developer/Altra/TIREApp/tireapp-web
```

**Files Created**:
- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`

**Verification**:
```bash
# Should show Next.js 15.x
pnpm list next

# Test dev server (don't leave running)
pnpm dev
# Open http://localhost:3000 → Should see Next.js welcome page
# Ctrl+C to stop
```

**Time Estimate**: 2 minutes

---

### Step 2: Install Authentication and Database Dependencies

**Task**: Add Auth.js v5 (beta), Prisma, and Neon drivers

**Commands**:
```bash
cd /Users/adambrown/Developer/Altra/TIREApp/tireapp-web

# Install Auth.js v5 (NextAuth beta)
pnpm add next-auth@beta @auth/prisma-adapter

# Install Prisma and Neon drivers
pnpm add @prisma/client @prisma/adapter-neon @neondatabase/serverless

# Install Prisma CLI as dev dependency
pnpm add -D prisma

# Verify installations
pnpm list next-auth @prisma/client
```

**Expected Output**:
```
dependencies:
├── @auth/prisma-adapter 2.8.0
├── @neondatabase/serverless 0.10.4
├── @prisma/adapter-neon 6.16.0
├── @prisma/client 6.16.0
└── next-auth 5.0.0-beta.25

devDependencies:
└── prisma 6.16.0
```

**Verification**:
```bash
# Check Prisma CLI available
pnpx prisma --version
# Should show: prisma 6.16.0 (or higher)
```

**Time Estimate**: 1 minute

---

### Step 3: Configure Environment Variables

**Task**: Create `.env.local.example` with placeholder credentials and documentation

**File**: `/tireapp-web/.env.local.example`

**Content**:
```env
# ============================================
# DATABASE CONFIGURATION (Neon Postgres)
# ============================================
# Obtain from Neon Dashboard: https://console.neon.tech/
#
# DATABASE_URL: Pooled connection for runtime queries
# Format: postgresql://[user]:[password]@[host]-pooler.neon.tech/[db]?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=15
DATABASE_URL="postgresql://user:password@host-pooler.neon.tech/tireapp?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=15"

# DIRECT_URL: Direct connection for Prisma migrations
# Format: postgresql://[user]:[password]@[host].neon.tech/[db]?sslmode=require&channel_binding=require
DIRECT_URL="postgresql://user:password@host.neon.tech/tireapp?sslmode=require&channel_binding=require"

# ============================================
# AUTH.JS (NextAuth v5) CONFIGURATION
# ============================================
# Generate AUTH_SECRET: npx auth secret
AUTH_SECRET="generate-with-npx-auth-secret"

# ============================================
# MICROSOFT ENTRA ID (Azure AD) CONFIGURATION
# ============================================
# Setup: https://portal.azure.com/ → App registrations → New registration
#
# AUTH_MICROSOFT_ENTRA_ID_ID: Application (client) ID
AUTH_MICROSOFT_ENTRA_ID_ID="00000000-0000-0000-0000-000000000000"

# AUTH_MICROSOFT_ENTRA_ID_SECRET: Client secret (Certificates & secrets)
AUTH_MICROSOFT_ENTRA_ID_SECRET="your-client-secret-value"

# AUTH_MICROSOFT_ENTRA_ID_ISSUER: Tenant-specific issuer URL
# Format: https://login.microsoftonline.com/[tenant-id]/v2.0
# Find tenant ID: Azure Portal → Microsoft Entra ID → Overview → Tenant ID
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0"

# ============================================
# NEXT.JS PUBLIC URL
# ============================================
# Local development: http://localhost:3000
# Production: Your deployed Vercel URL (e.g., https://tireapp.vercel.app)
NEXTAUTH_URL="http://localhost:3000"

# ============================================
# SETUP INSTRUCTIONS
# ============================================
# 1. Copy this file to .env.local (git-ignored)
# 2. Replace all placeholder values with real credentials
# 3. Generate AUTH_SECRET: npx auth secret
# 4. Create Neon database: https://console.neon.tech/
# 5. Register Azure AD app: https://portal.azure.com/
# 6. Configure redirect URI in Azure: http://localhost:3000/api/auth/callback/microsoft-entra-id
# 7. Run: pnpm prisma migrate dev --name init
# 8. Run: pnpm dev
```

**Action**:
```bash
# Create the example file
cat > /Users/adambrown/Developer/Altra/TIREApp/tireapp-web/.env.local.example << 'EOF'
[paste content above]
EOF

# Copy to .env.local (will be git-ignored)
cp .env.local.example .env.local

# Edit .env.local with real credentials (or leave placeholders for now)
# For development: Can start with placeholders and update later
```

**Verification**:
```bash
# Verify file created
ls -la .env.local.example .env.local

# Verify .env.local is git-ignored
git status .env.local
# Should show: ignored
```

**Time Estimate**: 2 minutes

---

### Step 4: Initialize Prisma and Create Database Schema

**Task**: Initialize Prisma and define schema with Auth.js models + future-ready TIREApp models

**Commands**:
```bash
cd /Users/adambrown/Developer/Altra/TIREApp/tireapp-web

# Initialize Prisma (creates prisma/ directory and schema.prisma)
pnpx prisma init
```

**File**: `/tireapp-web/prisma/schema.prisma`

**Content** (replace generated content):
```prisma
// Prisma schema for TIREApp Web (M1: Foundation and Authentication)
// Based on: M1-ResearchPack.md (Auth.js adapter requirements)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection (runtime)
  directUrl = env("DIRECT_URL")        // Direct connection (migrations)
}

// ============================================
// AUTH.JS REQUIRED MODELS (v5 with PrismaAdapter)
// Source: https://authjs.dev/reference/adapter/prisma
// ============================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          String    @default("Consultant") // "Consultant" or "Admin"

  accounts      Account[]
  sessions      Session[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// TIREAPP DOMAIN MODELS (Future-ready for M2+)
// Empty tables to establish schema structure
// ============================================

model Customer {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  applications Application[]

  @@map("customers")
}

model Application {
  id          String   @id @default(cuid())
  customerId  String
  name        String
  status      String   @default("pending") // "pending" | "in_progress" | "completed"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  customer      Customer       @relation(fields: [customerId], references: [id], onDelete: Cascade)
  questionnaires Questionnaire[]

  @@map("applications")
}

model Questionnaire {
  id            String   @id @default(cuid())
  applicationId String
  type          String   // "app_questions" | "strategy_questions"
  answers       Json     // Store question answers as JSON
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("questionnaires")
}

model Response {
  id        String   @id @default(cuid())
  userId    String   // Reference to User.id (not FK for now, will add later)
  appId     String   // Reference to Application.id
  data      Json     // Generic JSON storage for responses
  createdAt DateTime @default(now())

  @@map("responses")
}

model Export {
  id        String   @id @default(cuid())
  userId    String   // Reference to User.id
  appId     String   // Reference to Application.id
  fileUrl   String   // Vercel Blob URL
  format    String   // "xlsx" | "csv"
  createdAt DateTime @default(now())

  @@map("exports")
}

model Threshold {
  id        String   @id @default(cuid())
  key       String   @unique // e.g., "low_complexity", "high_risk"
  value     Float    // Numeric threshold value
  updatedAt DateTime @updatedAt

  @@map("thresholds")
}
```

**Action**:
```bash
# Overwrite generated schema with above content
# (Use editor or Write tool)

# Generate Prisma Client
pnpx prisma generate

# Note: Migration deferred until database credentials available
# To run migration when ready:
# pnpx prisma migrate dev --name init
```

**Verification**:
```bash
# Verify schema syntax
pnpx prisma validate

# Expected output:
# ✔ The schema at prisma/schema.prisma is valid
```

**Note**: Database migration (`prisma migrate dev`) will be run once Neon credentials are available. Schema is ready and validated.

**Time Estimate**: 3 minutes

---

### Step 5: Create Prisma Client Singleton

**Task**: Implement singleton pattern to prevent "too many connections" error in development

**File**: `/tireapp-web/lib/prisma.ts`

**Content**:
```typescript
// Prisma Client singleton for Next.js
// Prevents "too many connections" error in development (hot reload)
// Source: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Action**:
```bash
# Create lib directory
mkdir -p /Users/adambrown/Developer/Altra/TIREApp/tireapp-web/lib

# Create prisma.ts file
# (Use Write tool with content above)
```

**Verification**:
```bash
# Verify file exists
ls -la lib/prisma.ts

# Verify TypeScript compiles
pnpm exec tsc --noEmit
# Should show no errors
```

**Time Estimate**: 1 minute

---

### Step 6: Configure Auth.js with Microsoft Entra ID

**Task**: Create Auth.js configuration with Entra ID provider, PrismaAdapter, and role extraction

**File**: `/tireapp-web/auth.ts`

**Content**:
```typescript
// Auth.js (NextAuth v5) configuration for TIREApp
// Source: M1-ResearchPack.md (Auth.js v5 with Entra ID)

import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Database session strategy required for PrismaAdapter
  session: { strategy: "database" },

  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,

      // Extract role from Entra ID profile
      profile(profile) {
        // Check for 'roles' claim from Entra ID app roles
        // Fallback to "Consultant" if no role assigned
        const role = profile.roles?.[0] ?? "Consultant"

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: role, // "Consultant" or "Admin"
        }
      },
    }),
  ],

  callbacks: {
    // Persist role in JWT token
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },

    // Add role to session object
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
      }
      return session
    },
  },

  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
  },
})
```

**File**: `/tireapp-web/app/api/auth/[...nextauth]/route.ts`

**Content**:
```typescript
// Auth.js route handler for OAuth flow
// Source: https://authjs.dev/getting-started/installation

import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

**Action**:
```bash
# Create auth.ts in project root
# (Use Write tool with content above)

# Create Auth.js route handler directory
mkdir -p /Users/adambrown/Developer/Altra/TIREApp/tireapp-web/app/api/auth/\[...nextauth\]

# Create route.ts
# (Use Write tool with content above)
```

**Verification**:
```bash
# Verify files exist
ls -la auth.ts
ls -la app/api/auth/\[...nextauth\]/route.ts

# Verify TypeScript compiles
pnpm exec tsc --noEmit
```

**Time Estimate**: 2 minutes

---

### Step 7: Implement Route Protection Middleware

**Task**: Create middleware for route protection and role-based access control

**File**: `/tireapp-web/middleware.ts`

**Content**:
```typescript
// Route protection middleware for TIREApp
// Source: M1-ResearchPack.md (Auth.js middleware with RBAC)

import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Protect /app/* routes - require authentication
  if (pathname.startsWith('/app')) {
    if (!session) {
      // Redirect to sign-in with callback URL
      const url = new URL('/api/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect /admin/* routes - require Admin role
  if (pathname.startsWith('/admin')) {
    if (!session) {
      // Redirect to sign-in
      const url = new URL('/api/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    if (session.user?.role !== 'Admin') {
      // Redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return NextResponse.next()
})

// Configure which routes to protect
export const config = {
  matcher: [
    '/app/:path*',
    '/admin/:path*',
  ],
}
```

**Action**:
```bash
# Create middleware.ts in project root
# (Use Write tool with content above)
```

**Verification**:
```bash
# Verify file exists
ls -la middleware.ts

# Verify TypeScript compiles
pnpm exec tsc --noEmit
```

**Time Estimate**: 1 minute

---

### Step 8: Create Page Routes

**Task**: Create landing page, protected app home, admin dashboard, and unauthorized page

**File 1**: `/tireapp-web/app/page.tsx` (Landing Page - Public)

**Content**:
```typescript
// Landing page (public)

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">TIREApp Web</h1>
        <p className="text-xl mb-8">
          TIRE Framework Assessment Tool
        </p>
        <a
          href="/api/auth/signin"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign In with Microsoft
        </a>
      </div>
    </main>
  )
}
```

**File 2**: `/tireapp-web/app/app/page.tsx` (Protected App Home)

**Content**:
```typescript
// Protected application home (requires authentication)

import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AppPage() {
  const session = await auth()

  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Welcome, {session.user?.name}!
        </h1>
        <p className="text-lg mb-4">
          Role: <span className="font-semibold">{session.user?.role}</span>
        </p>
        <p className="text-gray-600 mb-8">
          You have successfully authenticated.
        </p>

        <div className="space-x-4">
          {session.user?.role === 'Admin' && (
            <a
              href="/admin"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Admin Dashboard
            </a>
          )}
          <a
            href="/api/auth/signout"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign Out
          </a>
        </div>
      </div>
    </main>
  )
}
```

**File 3**: `/tireapp-web/app/admin/page.tsx` (Admin Dashboard)

**Content**:
```typescript
// Admin dashboard (Admin role only)

import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const session = await auth()

  // Double-check role (middleware already protects, but defense in depth)
  if (!session || session.user?.role !== 'Admin') {
    redirect('/unauthorized')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-lg mb-8">
          Welcome, {session.user?.name} (Admin)
        </p>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-8">
          <p className="font-bold">M1: Foundation Complete</p>
          <p>Admin features will be implemented in M6 (Admin + Thresholds)</p>
        </div>

        <a
          href="/app"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to App
        </a>
      </div>
    </main>
  )
}
```

**File 4**: `/tireapp-web/app/unauthorized/page.tsx` (Unauthorized Page)

**Content**:
```typescript
// Unauthorized access page (insufficient permissions)

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-600">
          Access Denied
        </h1>
        <p className="text-lg mb-8">
          You do not have permission to access this page.
        </p>
        <p className="text-gray-600 mb-8">
          This page requires Admin privileges.
        </p>

        <a
          href="/app"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to App
        </a>
      </div>
    </main>
  )
}
```

**Action**:
```bash
# Create app directory for protected routes
mkdir -p /Users/adambrown/Developer/Altra/TIREApp/tireapp-web/app/app

# Create admin directory
mkdir -p /Users/adambrown/Developer/Altra/TIREApp/tireapp-web/app/admin

# Create unauthorized directory
mkdir -p /Users/adambrown/Developer/Altra/TIREApp/tireapp-web/app/unauthorized

# Create all page files
# (Use Write tool for each file with content above)

# Update root page.tsx (already exists from scaffold)
# (Overwrite with landing page content above)
```

**Verification**:
```bash
# Verify all pages exist
ls -la app/page.tsx
ls -la app/app/page.tsx
ls -la app/admin/page.tsx
ls -la app/unauthorized/page.tsx

# Verify TypeScript compiles
pnpm exec tsc --noEmit
```

**Time Estimate**: 3 minutes

---

### Step 9: Create Setup Documentation

**Task**: Add README.md with comprehensive setup instructions

**File**: `/tireapp-web/README.md`

**Content**:
```markdown
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
- pnpm (recommended) or npm
- Neon Postgres account: https://console.neon.tech/
- Azure AD tenant: https://portal.azure.com/

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
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
pnpm prisma generate

# Run migration to create tables
pnpm prisma migrate dev --name init

# Verify migration
pnpm prisma studio
# Opens browser UI to view database tables
```

### 6. Start Development Server

```bash
pnpm dev
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
pnpm dev
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
pnpm prisma migrate dev --name init
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
```

**Action**:
```bash
# Create README.md in tireapp-web
# (Use Write tool with content above)
```

**Verification**:
```bash
# Verify README exists
ls -la README.md

# Verify Markdown formatting
# (Open in editor or viewer)
```

**Time Estimate**: 2 minutes

---

### Step 10: Final Verification and Git Commit

**Task**: Verify all files created, TypeScript compiles, and commit M1 scaffold

**Verification Commands**:
```bash
cd /Users/adambrown/Developer/Altra/TIREApp/tireapp-web

# 1. Verify all required files exist
ls -la package.json tsconfig.json next.config.ts .env.local.example
ls -la auth.ts middleware.ts
ls -la lib/prisma.ts
ls -la prisma/schema.prisma
ls -la app/page.tsx app/app/page.tsx app/admin/page.tsx app/unauthorized/page.tsx
ls -la app/api/auth/\[...nextauth\]/route.ts
ls -la README.md

# 2. Verify TypeScript compilation
pnpm exec tsc --noEmit
# Expected: No errors

# 3. Verify Prisma schema valid
pnpx prisma validate
# Expected: ✔ The schema at prisma/schema.prisma is valid

# 4. Verify dependencies installed
pnpm list next next-auth @prisma/client
# Expected: All dependencies listed with versions

# 5. Test build (without database connection)
pnpm build
# Expected: Build succeeds (may warn about missing DATABASE_URL)
```

**Git Commit**:
```bash
cd /Users/adambrown/Developer/Altra/TIREApp

# Stage all new files in tireapp-web
git add tireapp-web/

# Verify .env.local NOT staged (should be git-ignored)
git status | grep .env.local
# Expected: No output (ignored)

# Create M1 completion commit
git commit -m "feat(M1): Scaffold Next.js 15 with Auth.js v5 and Neon Postgres

- Create fresh Next.js 15 project with App Router in /tireapp-web
- Configure Auth.js v5 (NextAuth beta) with Microsoft Entra ID provider
- Set up Prisma ORM with Neon Postgres (schema ready, migration pending)
- Implement middleware for route protection (/app/*, /admin/*)
- Add role-based access control (Consultant/Admin roles)
- Create landing page, protected app home, admin dashboard, unauthorized page
- Add comprehensive setup documentation in README.md
- Create .env.local.example with placeholder credentials

M1 Status: Foundation and Authentication scaffold complete
Next: Configure real Azure AD credentials and run database migration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Expected Output**:
```
[main abc1234] feat(M1): Scaffold Next.js 15 with Auth.js v5 and Neon Postgres
 14 files changed, 850 insertions(+)
 create mode 100644 tireapp-web/.env.local.example
 create mode 100644 tireapp-web/.gitignore
 create mode 100644 tireapp-web/README.md
 create mode 100644 tireapp-web/app/admin/page.tsx
 create mode 100644 tireapp-web/app/api/auth/[...nextauth]/route.ts
 create mode 100644 tireapp-web/app/app/page.tsx
 create mode 100644 tireapp-web/app/globals.css
 create mode 100644 tireapp-web/app/layout.tsx
 create mode 100644 tireapp-web/app/page.tsx
 create mode 100644 tireapp-web/app/unauthorized/page.tsx
 create mode 100644 tireapp-web/auth.ts
 create mode 100644 tireapp-web/lib/prisma.ts
 create mode 100644 tireapp-web/middleware.ts
 create mode 100644 tireapp-web/next.config.ts
 create mode 100644 tireapp-web/package.json
 create mode 100644 tireapp-web/postcss.config.mjs
 create mode 100644 tireapp-web/prisma/schema.prisma
 create mode 100644 tireapp-web/tailwind.config.ts
 create mode 100644 tireapp-web/tsconfig.json
```

**Time Estimate**: 2 minutes

---

**Total Estimated Time**: 19 minutes

---

## 🧪 Test Plan

### Manual Verification (M1 - No Automated Tests)

M1 focuses on scaffolding and configuration. Manual testing ensures the foundation is solid before implementing automated testing in M2+.

#### Test 1: Project Scaffold

**Steps**:
1. Navigate to `/tireapp-web`
2. Verify all 14 files created
3. Run `pnpm exec tsc --noEmit`
4. Run `pnpx prisma validate`

**Expected**:
- ✅ All files present
- ✅ TypeScript compiles without errors
- ✅ Prisma schema valid

#### Test 2: Development Server

**Steps**:
1. Copy `.env.local.example` to `.env.local`
2. Leave placeholder credentials (don't need real Azure AD yet)
3. Generate AUTH_SECRET: `npx auth secret`
4. Run `pnpm dev`
5. Open http://localhost:3000

**Expected**:
- ✅ Dev server starts successfully
- ✅ Landing page loads with "Sign In with Microsoft" button
- ⚠️ Sign-in will fail (no real Azure AD credentials) - expected

#### Test 3: Authentication Flow (Requires Real Credentials)

**Prerequisites**:
- Neon database created with valid DATABASE_URL and DIRECT_URL
- Azure AD app registered with valid credentials
- Database migration run: `pnpm prisma migrate dev --name init`

**Steps**:
1. Configure `.env.local` with real credentials
2. Run `pnpm dev`
3. Navigate to http://localhost:3000
4. Click "Sign In with Microsoft"
5. Complete Azure AD authentication
6. Verify redirect to `/app` page
7. Check user name and role displayed

**Expected**:
- ✅ Redirects to Azure AD sign-in
- ✅ Successfully authenticates
- ✅ Redirects back to `/app` page
- ✅ Displays user name from Entra ID profile
- ✅ Displays role ("Consultant" by default, "Admin" if configured)

#### Test 4: Route Protection

**Prerequisites**: Authenticated as Consultant

**Steps**:
1. Navigate to http://localhost:3000/app
2. Should load successfully (authenticated)
3. Navigate to http://localhost:3000/admin
4. Should redirect to `/unauthorized`

**Expected**:
- ✅ `/app` accessible as Consultant
- ✅ `/admin` redirects to `/unauthorized` for Consultant
- ✅ Unauthorized page displays "Access Denied" message

#### Test 5: Admin Access

**Prerequisites**: Authenticated as Admin (requires Entra ID app role assignment)

**Steps**:
1. Navigate to http://localhost:3000/admin
2. Should load successfully (Admin role)

**Expected**:
- ✅ `/admin` accessible as Admin
- ✅ Admin dashboard displays user name and "Admin" role

#### Test 6: Session Persistence

**Prerequisites**: Authenticated

**Steps**:
1. Sign in at http://localhost:3000
2. Navigate to `/app`
3. Refresh page (Cmd+R or F5)
4. Close browser tab
5. Reopen http://localhost:3000/app

**Expected**:
- ✅ Stays signed in after refresh
- ✅ Stays signed in after closing/reopening tab
- ✅ Session persists until expiration (default 30 days)

#### Test 7: Database Session Storage

**Prerequisites**: Authenticated, database migration run

**Steps**:
1. Sign in
2. Open Prisma Studio: `pnpm prisma studio`
3. Navigate to `sessions` table
4. Verify session record exists with:
   - `sessionToken` (unique)
   - `userId` (matches authenticated user)
   - `expires` (future timestamp)

**Expected**:
- ✅ Session record created in database
- ✅ `userId` matches `users` table record
- ✅ `expires` is in the future

#### Test 8: Rollback Verification

**Steps**:
1. Run rollback procedure (see below)
2. Verify Electron app still functional
3. Verify `/tireapp-web` directory removed

**Expected**:
- ✅ Electron app unaffected (still at v1.0.3)
- ✅ Web app directory cleanly removed
- ✅ Git history intact

---

## ⚠️ Risks & Mitigations

### Risk 1: Auth.js v5 Beta Instability

- **Probability**: Medium
- **Impact**: High (blocks authentication)
- **Mitigation**:
  - Pin to specific beta version (`next-auth@5.0.0-beta.25`) in package.json
  - Follow official migration guide: https://authjs.dev/getting-started/migrating-to-v5
  - Monitor Auth.js GitHub for breaking changes
- **Contingency**: Downgrade to Auth.js v4 (NextAuth v4) if critical bugs found
- **Detection**: Authentication fails, check Auth.js console errors

### Risk 2: Neon Connection Timeout in Serverless

- **Probability**: Low (mitigated in connection string)
- **Impact**: Medium (database queries fail intermittently)
- **Mitigation**:
  - Connection string includes `connect_timeout=15&pool_timeout=15`
  - Use Prisma connection pooling
  - Monitor Neon dashboard for connection metrics
- **Contingency**: Increase timeout values, switch to edge runtime for API routes
- **Detection**: `Error: connect ETIMEDOUT` in console

### Risk 3: Azure AD Misconfiguration

- **Probability**: High (complex setup)
- **Impact**: High (authentication fails completely)
- **Mitigation**:
  - Comprehensive `.env.local.example` with exact format
  - Detailed README.md with Azure AD setup steps
  - Verify redirect URI matches exactly (common mistake)
  - Test with single user before full rollout
- **Contingency**: Use Auth.js JWT strategy without PrismaAdapter (temporary workaround)
- **Detection**: OAuth errors in console: "invalid_client", "redirect_uri_mismatch"

### Risk 4: Prisma Migration Fails on First Run

- **Probability**: Medium
- **Impact**: Medium (database schema not created)
- **Mitigation**:
  - Validate schema before migration: `pnpx prisma validate`
  - Use `DIRECT_URL` for migrations (not pooled connection)
  - Test migration on fresh database first
- **Contingency**: Use `prisma db push` for prototyping (skip migrations)
- **Detection**: Migration error: "P1001 Can't reach database server"

### Risk 5: TypeScript Type Errors with Auth.js Session

- **Probability**: Medium
- **Impact**: Low (TypeScript errors, but runtime works)
- **Mitigation**:
  - Extend Auth.js types for custom `role` field
  - Add type declaration file: `types/next-auth.d.ts`
  - Use `// @ts-ignore` temporarily if blocked
- **Contingency**: Disable strict TypeScript checks for auth files only
- **Detection**: TypeScript error: "Property 'role' does not exist on type 'User'"

### Risk 6: Electron App Accidentally Modified

- **Probability**: Low (isolated subdirectory)
- **Impact**: Critical (breaks existing production app)
- **Mitigation**:
  - All changes confined to `/tireapp-web` directory
  - Git commit checkpoint before starting
  - Verify Electron app unchanged: `git diff --name-only`
- **Contingency**: Git rollback to pre-M1 checkpoint
- **Detection**: User reports Electron app broken after M1

**If Implementation Gets Stuck**:

1. **Check ResearchPack Gotchas**:
   - Auth.js v5 requires `@beta` flag?
   - Neon URLs correct (pooled vs direct)?
   - Issuer URL format correct (single tenant)?

2. **Verify File Paths**:
   - All files in `/tireapp-web` subdirectory?
   - Middleware at project root (not in `/app`)?
   - Auth route at `app/api/auth/[...nextauth]/route.ts`?

3. **Simplify Approach**:
   - Start with JWT sessions (skip PrismaAdapter)?
   - Use mock auth provider for initial testing?
   - Defer Azure AD setup until scaffold verified?

4. **Escalate**:
   - Report specific error message to user
   - Provide logs from `pnpm dev` console
   - Suggest manual intervention points

---

## 🔄 Rollback Plan

**If M1 implementation fails or introduces issues**:

### Immediate Rollback (< 30 sec)

```bash
cd /Users/adambrown/Developer/Altra/TIREApp

# Option 1: Revert to pre-M1 checkpoint
git reset --hard HEAD~1

# Option 2: Revert M1 commit specifically
git revert <M1-commit-hash>

# Option 3: Delete tireapp-web directory manually
rm -rf tireapp-web/
git add -A
git commit -m "Rollback: Remove M1 scaffold (failed verification)"
```

### Verification After Rollback

```bash
# 1. Confirm Electron app unaffected
ls -la main.js index.html
git diff main.js index.html
# Expected: No changes

# 2. Confirm tireapp-web removed
ls -la tireapp-web/
# Expected: No such file or directory

# 3. Test Electron app
cd /Users/adambrown/Developer/Altra/TIREApp
pnpm start
# Expected: Electron app launches normally
```

### Partial Rollback

If only some M1 components are problematic:

**Keep**:
- Next.js scaffold (package.json, tsconfig.json, next.config.ts)
- Prisma schema (schema.prisma)

**Revert**:
- Auth.js configuration (auth.ts, middleware.ts)
- Page routes (if broken)

**Commands**:
```bash
# Revert specific files
git checkout HEAD~1 -- tireapp-web/auth.ts tireapp-web/middleware.ts

# Test partial implementation
cd tireapp-web
pnpm dev
# Verify Next.js serves without auth
```

### Configuration Rollback

If environment variables cause issues:

**Restore `.env.local`**:
```bash
# Remove problematic config
rm tireapp-web/.env.local

# Copy clean example
cp tireapp-web/.env.local.example tireapp-web/.env.local

# Generate fresh AUTH_SECRET
cd tireapp-web
npx auth secret
```

### Database Rollback

If Prisma migration causes issues:

```bash
# Reset database to pre-migration state
cd tireapp-web
pnpx prisma migrate reset

# Or drop and recreate database in Neon Console
# Then regenerate schema:
pnpx prisma db push
```

**Rollback Triggers**:

- ❌ TypeScript compilation fails (`pnpm exec tsc --noEmit`)
- ❌ Prisma schema invalid (`pnpx prisma validate`)
- ❌ Next.js dev server won't start (`pnpm dev`)
- ❌ Electron app broken after M1 changes
- ❌ Git merge conflicts during M1 commit
- ❌ User requests rollback due to timeline constraints

---

## 📊 Success Criteria

Implementation is complete when:

### Core Requirements
- ✅ Next.js 15 project scaffolded in `/tireapp-web` subdirectory
- ✅ All 14 required files created and valid
- ✅ TypeScript compiles without errors (`pnpm exec tsc --noEmit`)
- ✅ Prisma schema validates (`pnpx prisma validate`)
- ✅ Development server starts successfully (`pnpm dev`)
- ✅ `.env.local.example` created with comprehensive documentation
- ✅ README.md includes setup instructions

### Authentication (When Real Credentials Configured)
- ✅ Auth.js v5 configured with Microsoft Entra ID provider
- ✅ PrismaAdapter integrated with database sessions
- ✅ Sign-in flow redirects to Azure AD and back successfully
- ✅ User profile (name, email, role) persisted to database
- ✅ Session persists across page refreshes

### Route Protection
- ✅ Middleware protects `/app/*` routes (requires authentication)
- ✅ Middleware protects `/admin/*` routes (requires Admin role)
- ✅ Unauthenticated users redirected to `/api/auth/signin`
- ✅ Non-admin users redirected to `/unauthorized` for admin routes

### Role-Based Access Control
- ✅ Consultant role can access `/app/*` routes
- ✅ Consultant role cannot access `/admin/*` routes
- ✅ Admin role can access all routes (`/app/*` and `/admin/*`)
- ✅ Role extracted from Entra ID profile (`roles` claim)
- ✅ Role defaults to "Consultant" if no role assigned

### Database Schema
- ✅ Auth.js required models created: `User`, `Account`, `Session`, `VerificationToken`
- ✅ Future-ready models created: `Customer`, `Application`, `Questionnaire`, `Response`, `Export`, `Threshold`
- ✅ Database migration ready (pending real credentials)

### Isolation and Safety
- ✅ Electron app (v1.0.3) completely unaffected
- ✅ All changes confined to `/tireapp-web` subdirectory
- ✅ Git commit created with M1 changes
- ✅ Rollback plan tested and documented

**Quality Checklist**:

- [ ] Code matches ResearchPack APIs exactly
  - Auth.js v5 (beta) usage correct
  - Prisma schema follows Auth.js adapter requirements
  - Middleware uses `auth()` from `@/auth`
  - Entra ID provider configuration matches ResearchPack
- [ ] Error handling implemented
  - Middleware handles missing session gracefully
  - Auth.js callback errors logged
  - Database connection errors caught
- [ ] Edge cases covered
  - User with no role defaults to "Consultant"
  - Session expiration handled automatically
  - Multiple sign-ins update existing session
- [ ] Documentation complete
  - README.md covers all setup steps
  - `.env.local.example` documents all variables
  - Inline code comments explain complex logic
- [ ] No hardcoded values
  - All credentials in environment variables
  - No placeholder strings in source code
- [ ] Logging added for debugging
  - Prisma logs queries in development
  - Auth.js errors visible in console
- [ ] Security concerns addressed
  - `.env.local` git-ignored
  - No secrets in source control
  - Session strategy uses database (revokable)

---

## 🔗 References

**ResearchPack**: `/migration/M1-ResearchPack.md` (score 100/100)

**Key Takeaways from Research**:
- Next.js 15 App Router stable and production-ready
- Auth.js v5 in beta, requires `@beta` flag for installation
- Neon requires two URLs: pooled (runtime) and direct (migrations)
- Prisma adapter requires `session.strategy = "database"`
- Microsoft Entra ID single-tenant issuer format critical
- 8 gotchas documented with workarounds

**Knowledge Core**:
- Pattern: Fresh subdirectory for isolated migration (zero risk to production)
- Pattern: Placeholder credentials with comprehensive documentation (enable immediate development)
- Decision: Database sessions over JWT-only (enable session revocation for enterprise)

**Codebase Patterns Observed**:
- Naming: Electron app uses lowercase filenames (`main.js`, `renderer.js`)
- Structure: Flat file structure in Electron app (no subdirectories)
- Testing: No automated tests in Electron app (manual testing only)
- Git: Conventional commit messages with detailed descriptions

**Migration Plan**: `/migration/1-migration-plan.md`

**Database Schema**: `/migration/2-db-api-contract.md`

**Parity Test Plan**: `/migration/3-parity-test-plan.md`

---

## 📊 Plan Metadata

- **Created**: 2026-01-26
- **Based on**: ResearchPack for Next.js 15.x, Auth.js v5 (beta), Prisma 6.16+, Neon Postgres
- **Agent**: @implementation-planner v2.0 (via @chief-architect)
- **Estimated Complexity**: Medium
  - Scaffolding: Low
  - Auth.js v5 beta: Medium (breaking changes from v4)
  - Azure AD setup: Medium (complex configuration)
  - Prisma + Neon: Low (well-documented)
- **Risk Level**: Low
  - Isolated subdirectory (zero risk to Electron app)
  - Comprehensive rollback plan
  - Manual testing sufficient for M1

---

✅ **Plan ready for @code-implementer**

**Next Steps**:
1. Review plan with user for approval
2. Run @brahma-analyzer for quality validation (target ≥85)
3. Execute implementation steps sequentially
4. Manual verification with real Azure AD credentials
5. Git commit M1 completion
6. Update WORKLOG.md and STATE.md
7. Proceed to M2: Data Model + Core APIs
