# Vercel Environment Variable Setup

## Problem
Dashboard shows "Loading your dashboard..." infinitely because:
- Frontend trying to connect to localhost:4000 in production
- Vercel doesn't read .env.production files automatically
- Environment variables MUST be set in Vercel dashboard

## Solution: Add Environment Variable to Vercel

### Option 1: Via Vercel Dashboard (RECOMMENDED)

1. Go to: https://vercel.com/dashboard
2. Select your Fundify project
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar
5. Click **Add New** button
6. Enter:
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://perfect-happiness-production.up.railway.app/api
   ```
7. Check ALL environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
8. Click **Save**
9. Go to **Deployments** tab
10. Find latest deployment → Click ⋮ menu → **Redeploy**

### Option 2: Via Vercel CLI

```bash
cd frontend
npx vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://perfect-happiness-production.up.railway.app/api

npx vercel env add NEXT_PUBLIC_API_URL preview
# Same value

npx vercel env add NEXT_PUBLIC_API_URL development
# Same value

# Then redeploy
npx vercel --prod
```

## Verify Setup

After deployment, check browser console:
- Should see: `API URL: https://perfect-happiness-production.up.railway.app/api`
- NOT: `API URL: http://localhost:4000/api`

## Test Backend is Working

```bash
curl https://perfect-happiness-production.up.railway.app/api/health
# Should return: {"status":"ok",...}
```

## Current Status
- ✅ Backend: Working on Railway
- ✅ Frontend: Deployed on Vercel
- ❌ Connection: Environment variable NOT set
- 🔧 Fix: Add NEXT_PUBLIC_API_URL to Vercel

## After Fix
Dashboard will load correctly and show:
- User stats
- Your campaigns
- Your donations
- Creator dashboard (if creator)
