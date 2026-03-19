# Test Users Guide

This document provides information about test users for development and testing purposes.

## Overview

The TIREApp includes a database seed file that creates test users for development and testing. These users allow you to test the application's authentication and role-based access control (RBAC) features without requiring Microsoft Entra ID configuration.

## Seeding Test Users

### Running the Seed Script

To create test users in your database, run the following command from the `tireapp-web` directory:

```bash
npm run db:seed
```

Or using Prisma directly:

```bash
npx prisma db seed
```

**Note:** Ensure your `DATABASE_URL` environment variable is properly configured before running the seed script.

## Available Test Users

The seed script creates two test users with different roles:

### 1. Admin User

**Purpose**: Full administrative access to all features

- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Role**: `Admin`
- **Permissions**:
  - Full access to all features
  - User management
  - Customer management
  - Application management
  - Settings and threshold configuration
  - All TIRE assessment features

### 2. Consultant User

**Purpose**: Standard consultant access for application assessment

- **Email**: `consultant@test.com`
- **Password**: `consultant123`
- **Role**: `Consultant`
- **Permissions**:
  - Customer management
  - Application management
  - TIRE assessment features
  - Read access to most features
  - Limited admin panel access

## Using Test Users

### Development Environment

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000

3. Click "Sign in"

4. Use one of the test user credentials listed above

### Testing Different Roles

To test role-based access control:

1. Sign in as the **Admin** user to test:
   - User management features
   - Settings and thresholds configuration
   - Full administrative capabilities

2. Sign in as the **Consultant** user to test:
   - Standard assessment workflows
   - Limited access scenarios
   - Typical user experience

## Security Considerations

⚠️ **Important Security Notes**:

- **Never use these credentials in production environments**
- These users are for **development and testing only**
- Change or remove these users before deploying to production
- Use strong, unique passwords for production admin accounts
- In production, use Microsoft Entra ID authentication

## Resetting Test Users

If you need to reset the test users:

1. Delete the existing users from the database:
   ```sql
   DELETE FROM users WHERE email IN ('admin@test.com', 'consultant@test.com');
   ```

2. Run the seed script again:
   ```bash
   npm run db:seed
   ```

## Customizing Test Users

To customize the test users, edit the seed file at `prisma/seed.ts`:

```typescript
// Example: Change the admin password
const adminPassword = await bcrypt.hash('your-new-password', 10);
```

After making changes, run the seed script again to apply them.

## Troubleshooting

### "User already exists" Error

If you see an error about duplicate users, it means the test users already exist in your database. The seed script uses `upsert` operations, which should handle this automatically. If you still encounter issues:

1. Clear existing test users from the database
2. Run the seed script again

### Authentication Fails

If you cannot authenticate with the test credentials:

1. Verify the database contains the test users:
   ```sql
   SELECT email, role FROM users WHERE email IN ('admin@test.com', 'consultant@test.com');
   ```

2. Ensure your `AUTH_SECRET` environment variable is set
3. Check that the authentication provider is configured correctly
4. Clear your browser cookies and try again

### Database Connection Issues

If the seed script fails to connect to the database:

1. Verify your `DATABASE_URL` is correct in `.env` or `.env.local`
2. Ensure the database is running and accessible
3. Check that Prisma migrations have been applied:
   ```bash
   npx prisma migrate dev
   ```

## Next Steps

After seeding test users:

1. Sign in with the admin account
2. Create your first customer
3. Upload an application list
4. Start conducting TIRE assessments

## Related Documentation

- [README.md](./README.md) - Main application documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [prisma/seed.ts](./prisma/seed.ts) - Seed script source code
- [prisma/schema.prisma](./prisma/schema.prisma) - Database schema

---

**For production environments**, always use Microsoft Entra ID authentication and never rely on these test credentials.
