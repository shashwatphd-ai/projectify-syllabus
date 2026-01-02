# EduThree Environment Variables

*Last Updated: 2026-01-02*

This document details all environment variables and secrets required for the EduThree platform.

---

## Overview

EduThree uses Lovable Cloud (Supabase) for secret management. All sensitive values are stored encrypted and accessible only to edge functions at runtime.

**Important:** Never commit API keys or secrets to the codebase.

---

## Auto-Configured Variables

These are automatically provisioned by Lovable Cloud and should **NOT** be modified:

| Variable | Description | Used By |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Edge functions, client |
| `SUPABASE_ANON_KEY` | Public anonymous key | Client SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin service role key | Edge functions |
| `SUPABASE_DB_URL` | Direct database connection | Migrations |
| `SUPABASE_PUBLISHABLE_KEY` | Alias for anon key | Legacy support |
| `LOVABLE_API_KEY` | Lovable AI gateway key | AI functions |

---

## Required Secrets

### Core Platform

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `APOLLO_API_KEY` | Apollo.io API for company discovery | [Apollo.io Dashboard](https://app.apollo.io) → Settings → API |
| `GEMINI_API_KEY` | Google Gemini AI API | [Google AI Studio](https://aistudio.google.com/apikey) |
| `RESEND_API_KEY` | Email delivery service | [Resend Dashboard](https://resend.com/api-keys) |
| `GOOGLE_PLACES_API_KEY` | Location geocoding | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

### Occupational Data

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `ONET_USERNAME` | O*NET Web Services username | [O*NET Web Services](https://services.onetcenter.org/) - Request access |
| `ONET_PASSWORD` | O*NET Web Services password | Provided with O*NET access |

### Optional Services

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `FIRECRAWL_API_KEY` | Web scraping for career pages | [Firecrawl](https://firecrawl.dev) → Dashboard |
| `ADZUNA_APP_ID` | Job search API | [Adzuna API](https://developer.adzuna.com) |
| `ADZUNA_APP_KEY` | Job search API key | Provided with Adzuna access |
| `LIGHTCAST_API_KEY` | Labor market data | [Lightcast](https://lightcast.io) → API Access |

---

## Configuration by Feature

### Company Discovery
Required:
- `APOLLO_API_KEY` - Primary company data source

Optional:
- `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` - Fallback job data

### AI Project Generation
Required:
- `LOVABLE_API_KEY` - AI gateway (auto-configured)
- `GEMINI_API_KEY` - Fallback AI provider

### Career Mapping
Required:
- `ONET_USERNAME` + `ONET_PASSWORD` - Occupational data

### Email Notifications
Required:
- `RESEND_API_KEY` - Email delivery

### Location Services
Required:
- `GOOGLE_PLACES_API_KEY` - Geocoding

### Web Scraping
Optional:
- `FIRECRAWL_API_KEY` - Career page scraping

---

## Adding Secrets

### Via Lovable UI

1. Open project in Lovable
2. Go to Settings → Cloud → Secrets
3. Click "Add Secret"
4. Enter name and value
5. Click Save

### Via Chat

Ask the AI to add a secret:
```
"Add the APOLLO_API_KEY secret"
```

The AI will prompt you to enter the value securely.

---

## Using Secrets in Edge Functions

### Accessing Secrets

```typescript
// In edge function
const apiKey = Deno.env.get("APOLLO_API_KEY");

if (!apiKey) {
  return new Response(
    JSON.stringify({ error: "APOLLO_API_KEY not configured" }),
    { status: 500 }
  );
}
```

### Best Practices

1. **Always check for null/undefined** before using
2. **Never log secret values** - even in development
3. **Use specific error messages** when secrets are missing
4. **Fail fast** if required secrets are unavailable

---

## Frontend Environment

The frontend has access to these **public** variables via Vite:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

**Access in code:**
```typescript
// These are auto-configured in client.ts
import { supabase } from "@/integrations/supabase/client";
```

---

## Security Guidelines

### Do

✅ Store all API keys in Lovable Cloud secrets
✅ Use `Deno.env.get()` in edge functions
✅ Check for missing secrets and fail gracefully
✅ Rotate secrets periodically
✅ Use least-privilege API keys when possible

### Don't

❌ Commit secrets to code
❌ Log secret values
❌ Store secrets in `.env` files (not supported)
❌ Hardcode API keys in source files
❌ Share secrets across environments

---

## Troubleshooting

### "Secret not found" Errors

1. Verify secret name matches exactly (case-sensitive)
2. Check secret is added in Cloud settings
3. Redeploy edge function after adding secret

### "Invalid API key" Errors

1. Verify key value is correct
2. Check key has required permissions
3. Confirm key hasn't expired
4. Verify key is for correct environment (prod vs dev)

### Rate Limiting

Many APIs have rate limits. Monitor usage:
- **Apollo**: Check credits in dashboard
- **Google Places**: Monitor in Cloud Console
- **Resend**: Check email quota

---

## Secret Rotation

When rotating secrets:

1. Generate new key in provider's dashboard
2. Update secret in Lovable Cloud
3. Verify edge functions work with new key
4. Revoke old key in provider's dashboard

---

## Connector-Managed Secrets

Some secrets are managed by Lovable connectors:

| Secret | Connector |
|--------|-----------|
| `FIRECRAWL_API_KEY` | Firecrawl connector |

These can only be modified through connector settings, not directly.

---

## Quick Reference

### Minimum Required Secrets

For basic platform functionality:
```
APOLLO_API_KEY
RESEND_API_KEY
ONET_USERNAME
ONET_PASSWORD
GOOGLE_PLACES_API_KEY
```

### Full Feature Set

All secrets for complete functionality:
```
APOLLO_API_KEY
RESEND_API_KEY
ONET_USERNAME
ONET_PASSWORD
GOOGLE_PLACES_API_KEY
GEMINI_API_KEY
FIRECRAWL_API_KEY
ADZUNA_APP_ID
ADZUNA_APP_KEY
LIGHTCAST_API_KEY
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-02 | Initial documentation |
