# EduThree Deployment Guide

*Last Updated: 2026-01-02*

This guide covers deployment procedures for the EduThree platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Frontend Deployment](#frontend-deployment)
5. [Backend Deployment](#backend-deployment)
6. [Database Migrations](#database-migrations)
7. [Edge Function Deployment](#edge-function-deployment)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Rollback Procedures](#rollback-procedures)
10. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Architecture Overview

EduThree uses a modern serverless architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Lovable)                      │
│                   React + Vite + Tailwind                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Lovable Cloud (Supabase)                  │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Auth     │  │   Database   │  │   Edge Functions   │   │
│  │ (JWT)     │  │  (Postgres)  │  │      (Deno)        │   │
│  └───────────┘  └──────────────┘  └────────────────────┘   │
│  ┌───────────┐  ┌──────────────┐                            │
│  │  Storage  │  │   Realtime   │                            │
│  │ (S3)      │  │ (WebSocket)  │                            │
│  └───────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Apollo   │  │  O*NET   │  │ Firecrawl│  │  Resend  │   │
│  │   API    │  │   API    │  │   API    │  │   Email  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools
- Node.js 18+ (for local development)
- Git
- Lovable account with Cloud enabled

### Required API Keys
See [Environment Variables](#environment-variables) section for full list.

---

## Environment Setup

### Required Secrets

Configure these in Lovable Cloud → Settings → Secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `APOLLO_API_KEY` | Apollo.io API key for company discovery | Yes |
| `GEMINI_API_KEY` | Google Gemini for AI features | Yes |
| `LOVABLE_API_KEY` | Lovable AI gateway access | Auto |
| `RESEND_API_KEY` | Email delivery via Resend | Yes |
| `FIRECRAWL_API_KEY` | Web scraping API | Optional |
| `ONET_USERNAME` | O*NET API credentials | Yes |
| `ONET_PASSWORD` | O*NET API credentials | Yes |
| `ADZUNA_APP_ID` | Adzuna job search API | Optional |
| `ADZUNA_APP_KEY` | Adzuna job search API | Optional |
| `GOOGLE_PLACES_API_KEY` | Location geocoding | Yes |
| `LIGHTCAST_API_KEY` | Labor market data | Optional |

### Auto-Configured (Do Not Modify)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## Frontend Deployment

### Automatic Deployment (Lovable)

1. **Make Changes**: Edit code in Lovable editor
2. **Preview**: Changes appear instantly in preview
3. **Publish**: Click "Publish" button in top-right
4. **Update**: Click "Update" in publish dialog to deploy

### Deployment URLs

| Environment | URL Pattern |
|-------------|-------------|
| Preview | `https://id-preview--{project-id}.lovable.app` |
| Production | `https://{project-name}.lovable.app` |
| Custom Domain | Configure in Settings → Domains |

### Important Notes

- **Frontend changes require clicking "Update"** to go live
- **Backend changes deploy immediately** (edge functions, migrations)
- Preview URL changes with each edit

---

## Backend Deployment

### Edge Functions

Edge functions deploy automatically when code changes.

**Deployment Process:**
1. Edit function in `supabase/functions/{function-name}/index.ts`
2. Save changes
3. Function deploys automatically (~30 seconds)
4. Check logs for deployment confirmation

**Manual Deployment (if needed):**
Edge functions can be deployed via the Lovable interface.

### Database Migrations

Database changes require explicit approval:

1. Use the database migration tool in chat
2. Review the SQL migration
3. Click "Apply" to execute
4. Types auto-regenerate after migration

---

## Database Migrations

### Creating Migrations

```sql
-- Example: Add new column
ALTER TABLE projects 
ADD COLUMN new_field TEXT;

-- Example: Create table with RLS
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
ON new_table FOR SELECT
USING (auth.uid() = user_id);
```

### Migration Best Practices

1. **Always enable RLS** on new tables
2. **Add appropriate policies** for each operation
3. **Use NOT NULL** where appropriate with defaults
4. **Add indexes** for frequently queried columns
5. **Test in preview** before production

---

## Edge Function Deployment

### Function Structure

```
supabase/functions/
├── _shared/              # Shared utilities
│   ├── cors.ts
│   ├── auth-middleware.ts
│   └── ...
├── function-name/
│   └── index.ts          # Main entry point
└── config.toml           # Function configuration
```

### Configuration (config.toml)

```toml
[functions.function-name]
verify_jwt = true           # Require authentication

[functions.public-function]
verify_jwt = false          # Public endpoint
```

### Deployment Checklist

- [ ] CORS headers configured
- [ ] Authentication middleware applied (if needed)
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Rate limiting headers included
- [ ] Input validation in place

---

## Post-Deployment Checklist

### After Frontend Deployment

- [ ] Verify all pages load correctly
- [ ] Test authentication flow (login/logout)
- [ ] Check protected routes work
- [ ] Verify API calls succeed
- [ ] Test on mobile viewport

### After Backend Deployment

- [ ] Check edge function logs for errors
- [ ] Verify database queries work
- [ ] Test RLS policies
- [ ] Confirm email delivery works
- [ ] Monitor API rate limits

### After Database Migration

- [ ] Verify migration applied successfully
- [ ] Check affected queries work
- [ ] Test RLS policies on new/modified tables
- [ ] Confirm types regenerated

---

## Rollback Procedures

### Frontend Rollback

1. Go to Settings → Versions
2. Find the previous stable version
3. Click "Restore" to rollback

### Database Rollback

**Important:** Database changes cannot be automatically rolled back.

For critical issues:
1. Create a new migration to revert changes
2. Test thoroughly in preview first
3. Apply the reverting migration

### Edge Function Rollback

1. Revert code changes in the editor
2. Functions will auto-deploy with previous code

---

## Monitoring & Troubleshooting

### Viewing Logs

**Edge Function Logs:**
- Use Lovable's log viewer
- Or use the analytics query tool in chat

```sql
-- Recent edge function errors
SELECT * FROM function_edge_logs
WHERE response.status_code >= 400
ORDER BY timestamp DESC
LIMIT 20;
```

**Database Logs:**
```sql
SELECT * FROM postgres_logs
WHERE parsed.error_severity IS NOT NULL
ORDER BY timestamp DESC
LIMIT 20;
```

**Auth Logs:**
```sql
SELECT * FROM auth_logs
WHERE metadata.level = 'error'
ORDER BY timestamp DESC
LIMIT 20;
```

### Common Issues

#### 1. CORS Errors
- Check `corsHeaders` is included in response
- Verify OPTIONS handler returns proper headers

#### 2. Authentication Failures
- Check JWT token is valid
- Verify `verify_jwt` setting in config.toml
- Check auth redirect URLs are configured

#### 3. Database Errors
- Review RLS policies
- Check user has required role
- Verify table/column exists

#### 4. Timeouts
- Check edge function logs
- Consider increasing timeout config
- Optimize slow queries

### Health Checks

Run the critical path validators:
1. Navigate to `/admin-hub/tests`
2. Click "Run All Tests"
3. Review results for any failures

---

## Performance Optimization

### Frontend
- Code splitting enabled via React.lazy()
- React Query caching (2min stale, 5min GC)
- Lazy loading on route components

### Backend
- Database indexes on frequently queried columns
- Connection pooling via Supabase
- Rate limiting on expensive endpoints

### Caching
- React Query handles client-side caching
- Company filter cache in database (7-day TTL)

---

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] RLS policies restrict access appropriately
- [ ] API keys stored in secrets (not code)
- [ ] Auth middleware on protected endpoints
- [ ] Input validation on all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting implemented

---

## Support

For deployment issues:
1. Check edge function logs
2. Run critical path validators
3. Review this documentation
4. Contact Lovable support if needed

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-02 | Initial deployment guide |
