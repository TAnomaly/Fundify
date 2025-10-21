# 🚀 Railway Deployment Guide - Fundify Rust Backend

Complete guide to deploy the Fundify Rust backend to Railway.

## 📋 Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Neon PostgreSQL database (or Railway PostgreSQL)

## 🔧 Railway Configuration

### 1️⃣ Root Directory
```
Root Directory: backend-rs
```

### 2️⃣ Build Configuration
Railway will automatically detect the `Dockerfile` and use it for building.

**Builder:** `DOCKERFILE`
**Dockerfile Path:** `Dockerfile`

### 3️⃣ Start Command
```bash
./fundify-backend
```

### 4️⃣ Environment Variables

Add these environment variables in Railway dashboard:

#### Required Variables:
```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_rRLz5k8qTHnc@ep-fancy-tooth-abl09hty-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=fundify-super-secret-jwt-key-change-in-production-123456789
JWT_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=production
RUST_LOG=info

# CORS & Frontend
CORS_ORIGIN=https://funify.vercel.app
FRONTEND_URL=https://funify.vercel.app

# Stripe
STRIPE_SECRET_KEY=sk_test_51SFzsr0izq3yR5HHq1H9up9KnweXGNuL4FCwVhgCfsQm7JQRnfs7JPSWhxwYe6dHCOVdDl64KnVqbaoTti1tIDWT00dxReVQgG
STRIPE_PUBLISHABLE_KEY=pk_test_51SFzsr0izq3yR5HHK1Usb3KACAEcOkJHAEfrToxkEeMv6ZuFyTlKAGJqGuGW6N1efxmHI90qQrFdo3I7Ofgqoikc00FQRFgmv8
STRIPE_WEBHOOK_SECRET=whsec_yeJ0JFRrLcC5nLsm3XlGgvbUy0dQZ4v7

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=Ov23liw50EgKtch7hVKg
GITHUB_CLIENT_SECRET=7e76e403e321a1a7bc03f11dd295fbb57d21572d
GITHUB_CALLBACK_URL=https://your-railway-url.up.railway.app/api/auth/github/callback

# Supabase (Optional)
SUPABASE_URL=https://xljawtuavcznqigmbrpt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamF3dHVhdmN6bnFpZ21icnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjczNjUsImV4cCI6MjA3NTcwMzM2NX0.YrXdKjg_O7oja25Kre8NhePveDCmmKTwTquW5Ak3NEk

# Redis (Optional - if using caching)
REDIS_URL=redis://default:password@redis.railway.internal:6379
REDIS_PUBLIC_URL=redis://default:password@host.railway.app:port

# RabbitMQ (Optional - if using message queue)
CLOUD_AMQP=amqps://user:pass@host.cloudamqp.com/vhost
```

## 📝 Step-by-Step Deployment

### Step 1: Prepare Repository
```bash
# Make sure you're in backend-rs directory
cd backend-rs

# Commit all changes
git add .
git commit -m "Add Rust backend for Railway deployment"
git push origin main
```

### Step 2: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your fundify repository
5. Railway will detect the repository

### Step 3: Configure Service
1. Click on the deployed service
2. Go to **Settings** tab
3. Set **Root Directory**: `backend-rs`
4. Verify **Build** section shows: `DOCKERFILE`
5. Set **Start Command**: `./fundify-backend`

### Step 4: Add Environment Variables
1. Go to **Variables** tab
2. Click "New Variable"
3. Add all variables from the list above
4. OR use "Raw Editor" and paste:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=fundify-super-secret-jwt-key-change-in-production-123456789
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=production
RUST_LOG=info
CORS_ORIGIN=https://funify.vercel.app
FRONTEND_URL=https://funify.vercel.app
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 5: Deploy
Railway will automatically deploy. Monitor the build logs:
- Build takes ~5-10 minutes (Rust compilation)
- Watch for "Server listening on http://0.0.0.0:4000"
- Check deployment status

### Step 6: Get Your URL
1. Go to **Settings** tab
2. Under **Networking**, click "Generate Domain"
3. Your backend will be available at: `https://your-service.up.railway.app`

### Step 7: Test Deployment
```bash
# Health check
curl https://your-service.up.railway.app/health

# API health check
curl https://your-service.up.railway.app/api/health

# Test auth
curl -X POST https://your-service.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123","name":"Test User"}'
```

## 🔍 Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure Rust version is compatible (1.70+)
- Verify Dockerfile syntax

### Server Not Starting
- Check environment variables are set
- Verify DATABASE_URL is correct
- Check logs for database connection errors

### Database Connection Issues
- Ensure DATABASE_URL includes `?sslmode=require` for Neon
- Check database is accessible from Railway
- Verify connection string format

### Port Issues
- Railway automatically sets PORT variable
- Make sure server binds to `0.0.0.0:$PORT`
- Default is 4000

## 📊 Monitoring

### View Logs
```bash
# In Railway dashboard
Go to your service → Logs tab
```

### Metrics
- CPU usage
- Memory usage
- Request count
- Response times

## 🔄 Redeploy

Railway auto-deploys on git push to main branch.

Manual redeploy:
1. Go to your service in Railway
2. Click "Redeploy"

## 🎯 Performance

**Rust Backend Advantages:**
- ⚡ Fast startup time (~10ms vs Node.js ~500ms)
- 💪 Low memory usage (~50MB vs Node.js ~200MB)
- 🚀 High throughput (100k+ req/sec)
- 🔒 Memory safety

## 📝 Notes

- First deploy takes longer (Rust compilation)
- Subsequent deploys use Docker layer caching
- Binary size: ~10-20MB (optimized)
- Cold start: <100ms

## 🔐 Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use production Stripe keys
- [ ] Enable HTTPS (Railway provides this)
- [ ] Set proper CORS origins
- [ ] Rotate database passwords
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts

## 🌐 Update Frontend

After deployment, update your frontend to use new backend URL:

```typescript
// In your frontend .env
NEXT_PUBLIC_API_URL=https://your-service.up.railway.app
```

## ✅ Success!

Your Rust backend is now deployed on Railway! 🎉

**Railway URL**: `https://your-service.up.railway.app`

Test your endpoints and enjoy the performance! 🚀