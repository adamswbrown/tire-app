# TIREApp Deployment Guide

## Prerequisites

1. **Vercel Account** - Sign up at https://vercel.com
2. **Neon PostgreSQL Database** - Create database at https://neon.tech
3. **Microsoft Entra ID App Registration** - Set up OAuth app in Azure Portal

## Environment Variables

Configure these in Vercel project settings:

### Database
- `DATABASE_URL` - Neon PostgreSQL connection string (with `sslmode=require`)

### Authentication (Auth.js v5 + Microsoft Entra ID)
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `AUTH_MICROSOFT_ENTRA_ID_ID` - Application (client) ID from Azure
- `AUTH_MICROSOFT_ENTRA_ID_SECRET` - Client secret from Azure
- `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` - Directory (tenant) ID from Azure
- `NEXTAUTH_URL` - Production URL (e.g., `https://tireapp.vercel.app`)

### Optional
- `NODE_ENV=production` (automatically set by Vercel)

## Deployment Steps

### 1. Connect Repository to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (from tireapp-web/ directory)
vercel link

# Or deploy directly
vercel --prod
```

### 2. Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required variables listed above
3. Ensure they're available for Production, Preview, and Development environments

### 3. Database Setup

```bash
# Run Prisma migrations against production database
DATABASE_URL="your-neon-connection-string" npx prisma migrate deploy

# Seed initial data (optional)
DATABASE_URL="your-neon-connection-string" npx prisma db seed
```

### 4. Microsoft Entra ID Configuration

In Azure Portal → App Registrations:

1. **Redirect URIs**: Add production callback
   - `https://your-domain.vercel.app/api/auth/callback/microsoft-entra-id`

2. **API Permissions**:
   - Microsoft Graph: `User.Read`
   - Microsoft Graph: `User.ReadBasic.All` (for user management)

3. **Authentication**:
   - Access tokens: Enabled
   - ID tokens: Enabled

### 5. Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment (for testing)
vercel
```

## Post-Deployment Checklist

- [ ] Test authentication flow with real Entra ID credentials
- [ ] Verify database connectivity and migrations applied
- [ ] Test customer creation and application management
- [ ] Verify Excel upload/export functionality
- [ ] Test TIRE scoring calculations
- [ ] Check admin panel access controls
- [ ] Test all RBAC roles (Admin, Consultant, Viewer)
- [ ] Verify security headers in browser DevTools
- [ ] Test on mobile devices (responsive design)

## Vercel-Specific Configuration

### Build Settings (Auto-detected)
- **Framework**: Next.js 16
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Security Headers
Configured in `vercel.json`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

### Regions
Primary region: `iad1` (US East - Washington DC)

## Monitoring & Logs

- **Vercel Dashboard**: Real-time logs and deployment status
- **Function Logs**: View in Vercel → Functions tab
- **Analytics**: Enable Vercel Analytics for traffic insights

## Rollback Procedure

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

## Troubleshooting

### Authentication Issues
- Verify AUTH_SECRET is set and matches across environments
- Check Entra ID redirect URI matches production URL
- Ensure NEXTAUTH_URL is set correctly

### Database Connection Issues
- Verify DATABASE_URL includes `sslmode=require` for Neon
- Check Neon database is not paused (free tier auto-pauses)
- Ensure Prisma migrations have been deployed

### Build Failures
- Check Node.js version (should be 20.x)
- Verify all dependencies are in package.json
- Review Vercel build logs for specific errors

## Production Optimization

- **Edge Functions**: Auth middleware runs on edge for low latency
- **ISR**: Consider incremental static regeneration for dashboard
- **Database Pooling**: Neon connection pooling enabled by default
- **CDN**: Vercel automatically CDN-caches static assets

## Cost Considerations

### Vercel
- Free tier: 100GB bandwidth, 100 serverless function executions
- Pro tier: $20/month for team features and higher limits

### Neon PostgreSQL
- Free tier: 0.5GB storage, shared compute
- Pro tier: $19/month for autoscaling compute

## Support & Maintenance

- **Vercel Support**: https://vercel.com/support
- **Neon Support**: https://neon.tech/docs
- **Auth.js Docs**: https://authjs.dev
