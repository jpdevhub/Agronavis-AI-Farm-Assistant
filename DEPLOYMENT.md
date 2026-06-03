# AgroNavis — Deployment Guide

## Architecture

| Layer | Service | Platform |
|---|---|---|
| Database | Supabase | `pzgtmrtwccuavthcyvjh.supabase.co` |
| Frontend | Next.js | Vercel |
| Backend | Python FastAPI | Hugging Face Spaces / Railway |

---

## Step 1: Apply Database Schema to Supabase

1. Go to **https://supabase.com/dashboard/project/pzgtmrtwccuavthcyvjh/sql/new**
2. Run migrations in order from `backend/supabase/migrations/`:
   - `20251007142940_initial_schema.sql`
   - `20260315000000_enhanced_schema.sql`
   - `20260324000000_enhanced_schema.sql`
   - `20260326000000_update_regional_soil.sql`
   - `20260602000000_crop_diseases_wiki.sql` (if exists)

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
NEXT_PUBLIC_WEATHER_API_KEY=your_openweathermap_api_key
```

4. Deploy

## Step 4: Deploy Backend to Hugging Face Spaces / Railway

1. Go to your hosting platform (Railway.app or Hugging Face Spaces).
2. Set **Root Directory** to `backend`.
3. Add environment variables:

```
SUPABASE_URL=https://pzgtmrtwccuavthcyvjh.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xc6r4xhF6bwGvAnwbrVPyA_MB33ZJ7t
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase Settings > API > service_role key>
PORT=8000
```

4. Ensure your hosting platform runs `pip install -r requirements.txt` and starts the server via:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

## Step 5: Update Vercel with Backend URL

After the backend deploys, go back to Vercel:
- Update `NEXT_PUBLIC_API_BASE_URL` to `https://your-backend-url/api`
- Redeploy

---

## Getting Supabase Service Role Key

1. Go to https://supabase.com/dashboard/project/pzgtmrtwccuavthcyvjh/settings/api
2. Copy **service_role** key (keep secret, never expose in frontend)

## Getting Google OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 Client ID (Web Application)
3. Authorized redirect URIs: `https://pzgtmrtwccuavthcyvjh.supabase.co/auth/v1/callback`
