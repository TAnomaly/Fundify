# Fundify Setup Instructions

## 🚀 Quick Start

This document contains **critical manual setup steps** required after deployment.

---

## ✅ Automatic Database Migrations (No Manual Steps!)

### SQLx Migration System

**Status**: ✅ **AUTOMATIC** - Runs on every deployment!

**How it works**:
1. Backend starts on Railway
2. SQLx checks `migrations/` directory
3. Runs pending migrations automatically
4. Database tables created/updated
5. No manual intervention needed!

**Migration Files**:
- `migrations/20251029000001_create_podcasts_tables.sql`
  - Creates `podcasts` table
  - Creates `podcast_episodes` table
  - Adds performance indexes

**Why SQLx instead of manual SQL**:
- ✅ Automatic on every deployment
- ✅ Version controlled migrations
- ✅ Idempotent (safe to run multiple times)
- ✅ No manual Railway console access needed
- ✅ Professional database management
- ✅ Rollback support if needed

---

## ✅ Automatic Deployments

### Backend (Railway)
- **Trigger**: Any push to `main` branch
- **Deploy Time**: ~2-3 minutes
- **Check**: https://perfect-happiness-production.up.railway.app/api/health

### Frontend (Vercel)
- **Trigger**: Any push to `main` branch
- **Deploy Time**: ~2-3 minutes
- **Check**: https://funify.vercel.app

---

## 🐛 Recent Fixes

### ✅ Like Button Fixed
- **Issue**: Multiple likes allowed, count going negative
- **Fix**: Backend now returns actual like status
- **Status**: ✅ Deployed to Railway

### ✅ Post Media Upload Fixed
- **Issue**: Uploaded images/videos not saving to posts
- **Fix**: Frontend now sends media regardless of post type
- **Status**: ✅ Deployed to Vercel

### ✅ Event Going Count Fixed
- **Issue**: Count resets to 0 after showing correct number
- **Fix**: Removed race condition in state updates
- **Status**: ✅ Deployed to Vercel

### ✅ Event Payment Flow
- **Status**: Already working correctly
- **Flow**: Payment → Auto RSVP → Ticket created
- **No action needed**

---

## 🔧 Environment Variables

### Backend (Railway)
Already configured in Railway dashboard:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis cache
- `STRIPE_SECRET_KEY` - Stripe payments
- `SUPABASE_URL` - File storage
- `SUPABASE_SERVICE_ROLE_KEY` - Storage auth
- `JWT_SECRET` - Authentication

### Frontend (Vercel)
Already configured in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe client key

---

## 📊 Deployment Status

| Component | Platform | Status | URL |
|-----------|----------|--------|-----|
| Backend | Railway | ✅ Auto-deploy | https://perfect-happiness-production.up.railway.app |
| Frontend | Vercel | ✅ Auto-deploy | https://funify.vercel.app |
| Database | Railway | ✅ Running | PostgreSQL + Redis |
| Storage | Supabase | ✅ Running | Media files |

---

## 🎨 Theme

**Current**: Renaissance Marble White
- Background: Warm marble white (#f7f5f2)
- Primary: Creative sage green (#66b876)
- Accent: Warm terracotta
- Style: Minimalist, clean, trustworthy

---

## 📝 Known Issues

### ✅ Podcast Tab - FIXED!
- **Previous Issue**: Shows "Failed to load podcast"
- **Previous Cause**: Database tables not created
- **Fix**: SQLx automatic migrations now handle this
- **Status**: ✅ Fixed with SQLx migrations
- **No manual action needed**: Tables auto-create on deployment

---

## 🔄 Cache Management

Backend uses Redis caching for:
- Event RSVP counts (30 sec TTL)
- Event details (90 sec TTL)
- Post feed (90 sec TTL)

Cache automatically invalidates on:
- New RSVP
- Post like/unlike
- Payment completion

---

## 🆘 Troubleshooting

### Podcast Tab Not Working
1. ✅ **No longer an issue** - Fixed with SQLx migrations
2. If still having issues, check backend logs for migration errors
3. Verify in Railway Query: `SELECT * FROM podcasts;`
4. Should return empty result (not error)

### Images Not Showing in Posts
1. Check Supabase bucket is public
2. Verify uploads folder exists
3. Check browser console for CORS errors

### Event Going Count Resets
1. Clear browser cache
2. Check backend logs for errors
3. Verify Redis is connected

### Like Button Issues
1. Check if logged in
2. Verify JWT token in localStorage
3. Check backend returns `liked: boolean`

---

## 📞 Support

- **Backend Logs**: Railway Dashboard → Deployments → Logs
- **Frontend Logs**: Vercel Dashboard → Deployments → Build Logs
- **Database**: Railway Dashboard → Database → Query

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
