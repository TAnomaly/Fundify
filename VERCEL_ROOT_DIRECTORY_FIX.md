# Vercel Root Directory Fix

## Problem
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies"
```

Vercel is looking for package.json in the root directory, but it's in `frontend/` folder.

## Solution: Set Root Directory in Vercel

### Steps:

1. Go to: https://vercel.com/dashboard
2. Select your **Fundify** project
3. Click **Settings** tab
4. Scroll down to **Root Directory** section
5. Click **Edit** button
6. Enter: `frontend`
7. Click **Save**

### Alternative: Remove vercel.json and use Vercel settings

If setting Root Directory doesn't work, delete the root `vercel.json` file:

```bash
rm vercel.json
rm package.json  # if exists in root
```

Then configure in Vercel dashboard:
- Root Directory: `frontend`
- Framework Preset: Next.js (auto-detected)
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

### Quick Fix (Recommended):

Run these commands:

```bash
# Remove conflicting files
git rm vercel.json
git rm package.json  # if exists
git commit -m "fix: Remove root vercel.json, configure via dashboard"
git push
```

Then in Vercel dashboard:
1. Settings → General → Root Directory → Edit → `frontend` → Save
2. Deployments → Latest → Redeploy

## After Fix

Build will succeed and you can add environment variable:
- Settings → Environment Variables
- Add: `NEXT_PUBLIC_API_URL` = `https://perfect-happiness-production.up.railway.app/api`
