# 📋 ResearchPack: Next.js 15 + Auth.js (NextAuth v5) + Microsoft Entra ID + Neon Postgres

## Task & Context

**Goal**: Set up foundation for TIREApp web migration with Next.js 15 App Router, Microsoft Entra ID authentication, role-based access control (Consultant/Admin), and Neon Postgres database.

**Technology Stack**:
- Language: TypeScript 5.x
- Runtime: Node.js 20.x
- Framework: Next.js 15 (App Router)
- Database: Neon Postgres (Vercel integrated)
- ORM: Prisma 6.16+
- Authentication: Auth.js v5 (NextAuth)
- Identity Provider: Microsoft Entra ID (single-tenant)

**Current Context**:
- **Existing**: Electron app v1.0.3 with electron-store and local file storage
- **Migration Target**: Web app on Vercel with server-side rendering and API routes
- **Requirements**: Preserve all functionality (imports, questionnaires, scoring, exports)

**Target Libraries**:

| Library | Version | Status | Official Docs |
|---------|---------|--------|---------------|
| **Next.js** | 15.x (latest) | ✅ Detected from DeepWiki | https://nextjs.org/docs |
| **Auth.js** | 5.x (NextAuth v5) | ✅ Detected from DeepWiki | https://authjs.dev |
| **Prisma** | 6.16+ | New dependency | https://www.prisma.io/docs |
| **Neon Serverless Driver** | Latest | New dependency | https://neon.com/docs |

**DeepWiki Status** (v4.1):
- **Repositories Queried**:
  - ✅ `vercel/next.js` - Next.js 15 App Router setup
  - ✅ `nextauthjs/next-auth` - Auth.js v5 with Entra ID
- **Primary Source**: DeepWiki (high confidence) + Official Docs (supplementary)
- **Confidence**: **HIGH** (DeepWiki verified + Official docs cross-referenced)

---

## 📚 Documentation Summary

### Key APIs

**Next.js 15 App Router**

This section covers Next.js 15 App Router APIs for routing, layouts, and server-side rendering. The App Router uses file-system based routing where folders define URL segments.

```typescript
// app/layout.tsx - Root layout (REQUIRED)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIREApp',
  description: 'TIRE Framework Assessment Tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/layout
```

```typescript
// app/page.tsx - Home route (publicly accessible)
export default function HomePage() {
  return <main>Landing page content</main>
}
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page
```

```typescript
// app/api/[endpoint]/route.ts - API Route Handler
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'response' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ success: true })
}
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route
```

**Auth.js (NextAuth v5) with Microsoft Entra ID**

This section covers Auth.js v5 configuration for Microsoft Entra ID authentication with session management and role-based access control.

```typescript
// auth.ts - Auth.js configuration with Entra ID
import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // Database session persistence
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
      profile(profile) {
        // Extract role from Entra ID profile (custom claim or group)
        const role = profile.roles?.[0] ?? "Consultant" // Default to Consultant
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
    jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
      }
      return session
    },
  },
})
// Source: https://authjs.dev/reference/nextjs (DeepWiki: nextauthjs/next-auth)
```

```typescript
// app/api/auth/[...nextauth]/route.ts - Auth.js Route Handler
import { handlers } from "@/auth"
export const { GET, POST } = handlers
// Source: https://authjs.dev/getting-started/installation (DeepWiki)
```

```typescript
// middleware.ts - Protect routes with middleware
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Redirect unauthenticated users to login
  if (!session && pathname.startsWith('/app')) {
    const url = new URL('/api/auth/signin', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && session?.user?.role !== 'Admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
}
// Source: https://authjs.dev/guides/middleware (DeepWiki)
```

**Prisma ORM with Neon Postgres**

This section covers Prisma ORM configuration for Neon Postgres with connection pooling and schema management.

```typescript
// prisma/schema.prisma - Database schema
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
}

// User model (required by Auth.js adapter)
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
}

// Account model (OAuth provider linkage)
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
}

// Session model (database session persistence)
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// VerificationToken model (email verification)
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
// Source: https://authjs.dev/reference/adapter/prisma
```

```typescript
// lib/prisma.ts - Prisma Client singleton
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
// Source: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
```

```typescript
// Example: Server Component data fetching
import { prisma } from '@/lib/prisma'

async function getCustomers() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return customers
}

export default async function CustomersPage() {
  const customers = await getCustomers()
  return (
    <div>
      {customers.map(customer => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  )
}
// Source: https://www.prisma.io/docs/guides/nextjs
```

**Neon Serverless Driver (Optional, for Edge)**

This section covers the Neon serverless driver for edge runtime compatibility, though Prisma is recommended for standard server-side operations.

```typescript
// Alternative: Using Neon serverless driver directly (Edge compatible)
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function getData() {
  const result = await sql`SELECT * FROM customers LIMIT 10`
  return result
}
// Source: https://neon.com/docs/guides/nextjs
```

---

### Setup & Configuration

**Step 1: Install Dependencies**

```bash
# Create Next.js 15 project with App Router
pnpm create next-app@latest tireapp-web --typescript --tailwind --app --yes

cd tireapp-web

# Install authentication dependencies
pnpm add next-auth@beta @auth/prisma-adapter

# Install database dependencies
pnpm add @prisma/client @prisma/adapter-neon @neondatabase/serverless
pnpm add -D prisma

# Optional: Install form validation
pnpm add zod
```

**Step 2: Configure Environment Variables**

Create `.env.local` file (ignored by git):

```env
# Database URLs (from Neon Console)
DATABASE_URL="postgresql://[user]:[password]@[host]-pooler.neon.tech/[db]?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=15"
DIRECT_URL="postgresql://[user]:[password]@[host].neon.tech/[db]?sslmode=require&channel_binding=require"

# Auth.js configuration
AUTH_SECRET="[generate with: npx auth secret]"
AUTH_MICROSOFT_ENTRA_ID_ID="[Azure AD Application ID]"
AUTH_MICROSOFT_ENTRA_ID_SECRET="[Azure AD Client Secret]"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/[tenant-id]/v2.0"

# Next.js public URL
NEXTAUTH_URL="http://localhost:3000" # or production URL
```

**Source**: https://vercel.com/docs/storage/vercel-postgres, https://neon.com/docs/guides/prisma

**Step 3: Initialize Prisma**

```bash
# Initialize Prisma schema
pnpx prisma init

# Create database schema (copy schema from Key APIs section above)
# Edit prisma/schema.prisma

# Run migration
pnpx prisma migrate dev --name init

# Generate Prisma Client
pnpx prisma generate
```

**Step 4: Create Auth.js Configuration**

Create `auth.ts` in project root (see Key APIs section for full code).

**Step 5: Add Middleware Protection**

Create `middleware.ts` in project root (see Key APIs section for full code).

**Step 6: Configure Microsoft Entra ID**

In Azure Portal:
1. Navigate to "App registrations" → "New registration"
2. Name: "TIREApp Web"
3. Supported account types: "Single tenant"
4. Redirect URI: `https://[your-domain]/api/auth/callback/microsoft-entra-id`
5. Copy Application (client) ID → `AUTH_MICROSOFT_ENTRA_ID_ID`
6. Create client secret → `AUTH_MICROSOFT_ENTRA_ID_SECRET`
7. Copy Directory (tenant) ID → Use in issuer URL

**Optional: Add custom roles claim**:
- App roles → Add role "Admin" and "Consultant"
- Token configuration → Add optional claim "roles"

**Source**: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app

---

### Gotchas & Version-Specific Issues

⚠️ **Auth.js v5 is in Beta**
- **Issue**: Auth.js v5 (NextAuth v5) is still in beta as of 2026-01
- **Workaround**: Install with `next-auth@beta` flag
- **Migration**: Breaking changes from v4 → v5 (handlers API, middleware signature)
- **Source**: https://authjs.dev/getting-started/migrating-to-v5

⚠️ **Vercel Postgres Deprecated (Dec 2024)**
- **Issue**: Vercel Postgres service discontinued, migrated to Neon
- **Impact**: Must use Neon Postgres or other Marketplace provider
- **Workaround**: Neon provides seamless Vercel integration with automatic environment variables
- **Source**: https://vercel.com/docs/storage/vercel-postgres

⚠️ **Prisma Adapter Database Session Required**
- **Issue**: Auth.js `PrismaAdapter` requires `session.strategy = "database"`
- **Impact**: Cannot use JWT-only sessions with database adapter
- **Workaround**: Use database sessions (recommended for security) or remove adapter for JWT
- **Source**: https://authjs.dev/reference/adapter/prisma

⚠️ **Neon Connection Pooling**
- **Issue**: Prisma migrations require direct connection, runtime requires pooled connection
- **Workaround**: Configure two URLs: `DATABASE_URL` (pooled) and `DIRECT_URL` (direct)
- **Details**: Pooled URL uses `-pooler` suffix in hostname
- **Source**: https://neon.com/docs/guides/prisma

⚠️ **Cold Start Timeouts**
- **Issue**: Serverless functions may timeout connecting to Neon (default 5s)
- **Workaround**: Increase `connect_timeout` parameter: `?connect_timeout=15`
- **Additional**: Adjust `pool_timeout=15` for connection pool
- **Source**: https://www.prisma.io/docs/orm/overview/databases/neon

⚠️ **Next.js 15 Turbopack**
- **Issue**: Turbopack (new bundler) may have compatibility issues with some packages
- **Workaround**: Disable Turbopack if issues arise: `next dev --no-turbo`
- **Status**: Turbopack is production-ready in Next.js 15 but still maturing
- **Source**: https://nextjs.org/docs/architecture/turbopack

⚠️ **Microsoft Entra ID Profile Picture**
- **Issue**: Entra ID returns profile pictures as ArrayBuffer (binary data)
- **Impact**: Auth.js converts to base64 string, increases JWT size
- **Workaround**: Default image size is 48x48 to avoid session size issues
- **Alternative**: Store image URL separately, fetch on demand
- **Source**: https://authjs.dev/reference/providers/microsoft-entra-id (DeepWiki)

⚠️ **Single Tenant Configuration**
- **Issue**: Entra ID issuer URL must match tenant type
- **Single Tenant**: `https://login.microsoftonline.com/[tenant-id]/v2.0`
- **Multi-Tenant**: `https://login.microsoftonline.com/common/v2.0`
- **Impact**: Wrong issuer causes authentication failures
- **Source**: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc

---

### Minimal Working Example

**Complete authentication flow with role-based access**:

```typescript
// auth.ts
import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: profile.roles?.[0] ?? "Consultant",
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as string
      return session
    },
  },
})

// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers

// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/api/auth/signin', req.url))
  }

  if (pathname.startsWith('/admin') && session?.user?.role !== 'Admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
}

// app/app/page.tsx - Protected route (Server Component)
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AppPage() {
  const session = await auth()

  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <main>
      <h1>Welcome, {session.user?.name}!</h1>
      <p>Role: {session.user?.role}</p>
    </main>
  )
}

// app/admin/page.tsx - Admin-only route (Server Component)
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const session = await auth()

  if (!session || session.user?.role !== 'Admin') {
    redirect('/unauthorized')
  }

  return <main><h1>Admin Dashboard</h1></main>
}
```

**Demonstrates**:
- Microsoft Entra ID authentication
- Database session persistence with Prisma
- Role extraction from Entra ID profile
- Middleware route protection
- Role-based access control (RBAC)
- Server Component session access

**Source**: Synthesized from DeepWiki (nextauthjs/next-auth) + Official Auth.js docs

---

## ✅ Implementation Checklist

### Project Structure

```
tireapp-web/
├── app/
│   ├── layout.tsx                 # Root layout (required)
│   ├── page.tsx                   # Landing page
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts       # Auth.js handlers
│   ├── app/
│   │   ├── page.tsx               # Protected app home
│   │   ├── customers/
│   │   │   └── page.tsx           # Customer list
│   │   └── questionnaire/
│   │       └── page.tsx           # Questionnaire UI
│   ├── admin/
│   │   ├── page.tsx               # Admin dashboard
│   │   └── thresholds/
│   │       └── page.tsx           # Threshold management
│   └── unauthorized/
│       └── page.tsx               # Unauthorized access page
├── prisma/
│   └── schema.prisma              # Database schema
├── lib/
│   └── prisma.ts                  # Prisma Client singleton
├── auth.ts                        # Auth.js configuration
├── middleware.ts                  # Route protection
├── .env.local                     # Environment variables (gitignored)
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript config
```

### Files to Create

- [ ] `auth.ts` - Auth.js configuration with Entra ID provider
- [ ] `middleware.ts` - Route protection and RBAC enforcement
- [ ] `app/api/auth/[...nextauth]/route.ts` - Auth.js route handlers
- [ ] `lib/prisma.ts` - Prisma Client singleton
- [ ] `prisma/schema.prisma` - Database schema with User, Account, Session models
- [ ] `.env.local` - Environment variables (DATABASE_URL, AUTH_* secrets)
- [ ] `app/layout.tsx` - Root layout with auth provider
- [ ] `app/page.tsx` - Landing page
- [ ] `app/app/page.tsx` - Protected application home
- [ ] `app/admin/page.tsx` - Admin-only page
- [ ] `app/unauthorized/page.tsx` - Unauthorized access handler

### Implementation Steps (in order)

1. [ ] **Create Next.js 15 project**
   ```bash
   pnpm create next-app@latest tireapp-web --typescript --tailwind --app --yes
   ```

2. [ ] **Install authentication dependencies**
   ```bash
   pnpm add next-auth@beta @auth/prisma-adapter
   ```

3. [ ] **Install database dependencies**
   ```bash
   pnpm add @prisma/client @prisma/adapter-neon @neondatabase/serverless
   pnpm add -D prisma
   ```

4. [ ] **Configure Neon Postgres on Vercel**
   - Create Neon database via Vercel Marketplace
   - Copy connection strings to `.env.local`
   - Verify `DATABASE_URL` (pooled) and `DIRECT_URL` (direct)

5. [ ] **Initialize Prisma schema**
   ```bash
   pnpx prisma init
   ```
   - Copy schema from Key APIs section
   - Add User, Account, Session, VerificationToken models

6. [ ] **Run database migration**
   ```bash
   pnpx prisma migrate dev --name init
   pnpx prisma generate
   ```

7. [ ] **Register Azure AD application**
   - Create single-tenant app registration
   - Configure redirect URI: `/api/auth/callback/microsoft-entra-id`
   - Create client secret
   - Copy credentials to `.env.local`
   - Optional: Configure app roles (Admin, Consultant)

8. [ ] **Create Auth.js configuration (`auth.ts`)**
   - Configure MicrosoftEntraID provider
   - Set up PrismaAdapter
   - Implement role extraction in `profile()` callback
   - Add JWT and session callbacks for role persistence

9. [ ] **Create Prisma Client singleton (`lib/prisma.ts`)**
   - Implement singleton pattern for development
   - Configure logging

10. [ ] **Set up Auth.js route handler**
    - Create `app/api/auth/[...nextauth]/route.ts`
    - Export GET and POST handlers

11. [ ] **Create middleware protection (`middleware.ts`)**
    - Protect `/app/*` routes (require authentication)
    - Protect `/admin/*` routes (require Admin role)
    - Configure matcher pattern

12. [ ] **Create page routes**
    - Landing page (`app/page.tsx`)
    - Protected app home (`app/app/page.tsx`)
    - Admin dashboard (`app/admin/page.tsx`)
    - Unauthorized page (`app/unauthorized/page.tsx`)

13. [ ] **Test authentication flow**
    - Start dev server: `pnpm dev`
    - Navigate to protected route → redirects to Entra ID login
    - Sign in as Consultant → access `/app/*` routes
    - Sign in as Admin → access `/admin/*` routes
    - Verify session persistence across page refreshes

14. [ ] **Verify role-based access control**
    - Consultant cannot access `/admin/*` → redirects to `/unauthorized`
    - Admin can access all routes
    - Session data includes role field

### Edge Cases to Handle

- [ ] **What if user has no role in Entra ID profile?**
  - **Solution**: Default to "Consultant" role in `profile()` callback
  - **Validation**: Check `profile.roles?.[0] ?? "Consultant"`

- [ ] **How to handle expired sessions?**
  - **Solution**: Auth.js automatically handles session expiration
  - **User Experience**: Redirect to login page with `callbackUrl` parameter
  - **Database**: Expired sessions cleaned up automatically

- [ ] **What if Neon connection times out?**
  - **Solution**: Increase `connect_timeout` parameter in DATABASE_URL
  - **Recommended**: `?connect_timeout=15&pool_timeout=15`
  - **Fallback**: Show user-friendly error message with retry option

- [ ] **How to handle Entra ID authentication failures?**
  - **Solution**: Auth.js provides error handling in sign-in flow
  - **User Experience**: Display error message on callback page
  - **Logging**: Log authentication errors for debugging

- [ ] **What if Prisma migration fails?**
  - **Solution**: Use `prisma db push` for prototyping (skip migrations)
  - **Production**: Always use migrations (`prisma migrate deploy`)
  - **Rollback**: Prisma doesn't support automatic rollback, use git to revert

- [ ] **How to handle multiple admin users?**
  - **Solution**: Assign "Admin" role via Entra ID app roles
  - **Alternative**: Add admin management UI to promote/demote users
  - **Database**: Store role in User model, override from Entra ID on login

---

## 🔗 Authoritative Sources

### Primary Sources (DeepWiki)

1. **Next.js App Router** - https://deepwiki.com/search/how-do-i-set-up-nextjs-15-with_7fe28138-2043-47a4-af26-7e54a9b3b2c8
   - Repository: `vercel/next.js`
   - Section: App Router architecture, routing patterns, production optimizations
   - Version: Next.js 15.x (latest)
   - Confidence: HIGH (official repository)

2. **Auth.js (NextAuth v5) with Entra ID** - https://deepwiki.com/search/how-do-i-set-up-authjs-nextaut_71313b4e-36fb-4983-b978-8d89aec5a636
   - Repository: `nextauthjs/next-auth`
   - Section: Microsoft Entra ID provider, session management, middleware, RBAC
   - Version: Auth.js v5 (NextAuth beta)
   - Confidence: HIGH (official repository)

### Official Documentation

3. **Next.js Official Docs** - https://nextjs.org/docs
   - Section: App Router, API routes, server components, middleware
   - Version: Next.js 15

4. **Auth.js Official Docs** - https://authjs.dev
   - Section: Getting started, providers, adapters, callbacks
   - Version: v5 (beta)

5. **Prisma with Neon** - https://www.prisma.io/docs/orm/overview/databases/neon
   - Section: Schema configuration, migrations, connection pooling
   - Version: Prisma 6.16+

6. **Neon Postgres + Next.js** - https://neon.com/docs/guides/nextjs
   - Section: Connection setup, environment variables, server actions
   - Version: Latest

7. **Microsoft Entra ID Setup** - https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
   - Section: App registration, redirect URIs, client secrets, custom claims
   - Version: Current

### Supplementary Sources (Web Search)

8. **Vercel Postgres Migration** - https://vercel.com/docs/storage/vercel-postgres
   - Note: Service deprecated December 2024, migrated to Neon
   - Relevance: Understanding Vercel's current database strategy

9. **Prisma with Next.js 15** - https://www.prisma.io/docs/guides/nextjs
   - Section: Best practices, singleton pattern, error handling
   - Version: Next.js 15 + Prisma 6

10. **Medium: Next.js 15 + Neon + Prisma** - https://medium.com/@sajjadast786/next-js-15-postgresql-neon-prisma-zod-useactionstate-useformstatus-fullstack-app-a85ed7de9cea
    - Section: Full-stack setup example
    - Date: 2025 (recent)

**Confidence Level**: **HIGH**
- ✅ Official docs for exact versions found (Next.js 15, Auth.js v5)
- ✅ DeepWiki verified repository documentation
- ✅ Multiple authoritative sources cross-referenced
- ✅ All APIs cited with source URLs

---

## ❓ Open Questions

### For User

- [ ] **Entra ID tenant configuration**: Do you have an existing Azure AD tenant for TIREApp, or should we create a new one?
- [ ] **Role assignment method**: Should roles (Consultant/Admin) be assigned via Entra ID app roles, or through a database management UI?
- [ ] **Session duration**: What's the desired session timeout? (Default: 30 days for database sessions)
- [ ] **Multi-factor authentication**: Should we enforce MFA through Entra ID conditional access policies?
- [ ] **Custom domain**: Will TIREApp use a custom domain, or Vercel's auto-generated domain?

### For Planner (@implementation-planner)

- [ ] **Deployment strategy**: Should we create separate Vercel projects for staging/production, or use preview deployments?
- [ ] **Database seeding**: Should we seed initial admin users during migration, or handle manually?
- [ ] **Environment variable management**: Use Vercel's environment variable UI, or implement secret management service?
- [ ] **Prisma migration strategy**: Use `prisma migrate deploy` in CI/CD, or manual migrations?
- [ ] **Error monitoring**: Integrate Sentry or similar for production error tracking?
- [ ] **Type safety**: Extend Auth.js types for custom `role` field in session?

---

## 📊 Research Metadata

- **Started**: 2026-01-26 10:00 (approx)
- **Completed**: 2026-01-26 10:15 (approx)
- **Duration**: ~15 minutes
- **Sources Consulted**: 10 (2 DeepWiki, 5 Official Docs, 3 Supplementary)
- **DeepWiki Queries**: 2 (vercel/next.js, nextauthjs/next-auth)
- **WebSearch Queries**: 2 (Vercel Postgres, Prisma + Neon)
- **WebFetch Queries**: 3 (Vercel docs, Neon docs, Prisma docs)
- **Agent**: @docs-researcher (via @chief-architect)
- **Version**: docs-researcher v2.0 + DeepWiki v4.1

---

✅ **Research complete** - Ready for @implementation-planner

**Next Steps**:
1. Review open questions with user
2. Pass ResearchPack to @implementation-planner for architectural design
3. Run @brahma-analyzer for quality validation (target ≥80)
