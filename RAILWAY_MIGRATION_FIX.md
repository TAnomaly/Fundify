# 🚨 RAILWAY DATABASE MIGRATION FIX

## Problem
```
The column `User.isCreator` does not exist in the current database.
```

Backend'de yeni Patreon özelliklerini ekledik ama **production database'e migration çalıştırmadık!**

## Solution: Run Migration on Railway

### Option 1: Via Railway Dashboard (RECOMMENDED)

1. Go to: https://railway.app/dashboard
2. Select your **Fundify Backend** project
3. Click on **Deployments** tab
4. Latest deployment → Click **View Logs**
5. Check if migration ran automatically
   - Look for: `Prisma Migrate`
   - If not found, migration didn't run

### Option 2: Manual Migration (If auto-migration failed)

#### Step 1: Get Railway Database URL

1. Railway Dashboard → Your Backend Project
2. Click **Variables** tab
3. Find `DATABASE_URL` and copy it
4. Format: `postgresql://user:pass@host:port/database`

#### Step 2: Run Migration Locally Against Production

```bash
cd backend

# Set production database URL temporarily
export DATABASE_URL="postgresql://user:pass@railway.host:port/railway"

# Run migration
npx prisma migrate deploy

# Or if that fails, force reset (⚠️ DELETES DATA)
# npx prisma migrate reset --skip-seed
```

### Option 3: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run npx prisma migrate deploy
```

### Option 4: Add Migration to Build Command

1. Railway Dashboard → Backend Project
2. Settings → Build & Deploy
3. Find **Build Command**
4. Change to: `npm run build && npx prisma migrate deploy`
5. Save
6. Redeploy

## Verify Migration Success

```bash
curl -X POST https://perfect-happiness-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}'

# Should return token, NOT database error
```

## What Migrations Need to Run

These are the new features that need database changes:
- `User.isCreator` - Creator flag
- `User.creatorBio` - Creator bio
- `User.socialLinks` - Creator social links
- `CampaignType` - Campaign type enum
- `MembershipTier` - Subscription tiers
- `Subscription` - User subscriptions
- `CreatorPost` - Exclusive content

## Quick Fix Script

```bash
#!/bin/bash
cd backend

# Get Railway DATABASE_URL (replace with your actual URL)
export DATABASE_URL="your-railway-database-url"

# Run pending migrations
npx prisma migrate deploy

# Verify schema is up to date
npx prisma db pull

echo "Migration complete!"
```

## After Migration

1. Test login: Should work ✅
2. Test register: Should work ✅
3. Dashboard should load ✅
4. Creator features available ✅
