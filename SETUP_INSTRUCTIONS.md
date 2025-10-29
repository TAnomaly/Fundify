# Fundify Setup Instructions

## 🚀 Quick Start

This document contains **critical manual setup steps** required after deployment.

---

## ⚠️ Required Manual Steps

### 1. Podcast Tables Setup (Railway Database)

**Status**: 🔴 **REQUIRED** - Podcast tab won't work without this

**Why**: PostgreSQL database is missing `podcasts` and `podcast_episodes` tables

**Steps**:
1. Go to [Railway Dashboard](https://railway.app)
2. Select your project → Database
3. Click "Query" tab
4. Copy the contents of `/backend/create_podcasts_table.sql`
5. Paste into query editor
6. Click "Execute"

**SQL File Location**: `backend/create_podcasts_table.sql`

**What it creates**:
- `podcasts` table with creator relationship
- `podcast_episodes` table with audio URLs
- Performance indexes for fast queries

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

### 🟡 Podcast Tab
- **Issue**: Shows "Failed to load podcast"
- **Cause**: Database tables not created
- **Fix**: Run SQL script (see step 1 above)
- **Priority**: High

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
1. Check if SQL script was executed
2. Verify in Railway Query: `SELECT * FROM podcasts;`
3. Should return empty result (not error)

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
