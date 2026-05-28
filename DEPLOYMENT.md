# AgroNavis — Deployment Guide

## Architecture

| Layer | Service | Platform |
|---|---|---|
| Database | Supabase | `pzgtmrtwccuavthcyvjh.supabase.co` |
| Frontend | Next.js | Vercel |
| Backend | Express API | Railway / Render |

---

## Step 1: Apply Database Schema to Supabase

1. Go to **https://supabase.com/dashboard/project/pzgtmrtwccuavthcyvjh/sql/new**
2. Run migrations in order:
   - `backend/supabase/migrations/20251007142940_initial_schema.sql`
   - `backend/supabase/migrations/20260315000000_enhanced_schema.sql`
   - `backend/supabase/migrations/20260324000000_enhanced_schema.sql`
   - `backend/supabase/migrations/20260326000000_update_regional_soil.sql`

## Step 2: Enable Google Auth in Supabase

1. Go to **Authentication > Providers > Google**
2. Enable Google
3. Add your Google OAuth Client ID + Secret (from Google Cloud Console)
4. Set Redirect URL in Google Console: `https://pzgtmrtwccuavthcyvjh.supabase.co/auth/v1/callback`
5. In Supabase **Auth > URL Configuration**, add your frontend URL to **Redirect URLs**:
   - `https://your-vercel-app.vercel.app/auth/callback`

## Step 3: Deploy Frontend to Vercel

1. Go to vercel.com → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Add environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://pzgtmrtwccuavthcyvjh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xc6r4xhF6bwGvAnwbrVPyA_MB33ZJ7t
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WEATHER_API_KEY=77f8b772e88affb1f644dd32c8c13396
```

4. Deploy

## Step 4: Deploy Backend to Railway

1. Go to railway.app → New Project → GitHub Repo
2. Set **Root Directory** to `backend`
3. Add environment variables:

```
SUPABASE_URL=https://pzgtmrtwccuavthcyvjh.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xc6r4xhF6bwGvAnwbrVPyA_MB33ZJ7t
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase Settings > API > service_role key>
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
JWT_SECRET=zGeWmDqBCqgrlaQC/3+gLtqebIzPIROhtEmeQt5wKdXzq3/WehNMbnvTz8hmt76jjswf1r8yXroDrCzHHHHfdQ==
```

4. Deploy → Copy the Railway URL

## Step 5: Update Vercel with Backend URL

After Railway deploys, go back to Vercel:
- Update `NEXT_PUBLIC_API_BASE_URL` to `https://your-railway-url.railway.app/api`
- Redeploy

## Step 6: Update CORS in Backend

In Railway env vars, update:
```
CORS_ORIGIN=https://your-app.vercel.app
```

---

## Getting Supabase Service Role Key

1. Go to https://supabase.com/dashboard/project/pzgtmrtwccuavthcyvjh/settings/api
2. Copy **service_role** key (keep secret, never expose in frontend)

## Getting Google OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 Client ID (Web Application)
3. Authorized redirect URIs: `https://pzgtmrtwccuavthcyvjh.supabase.co/auth/v1/callback`
