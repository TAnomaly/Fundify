# Fundify Setup Guide

Complete setup guide for the Fundify crowdfunding platform.

## Prerequisites

- Node.js 20+
- PostgreSQL database (or use Neon/Supabase)
- Supabase account for file storage
- Stripe account for payments
- GitHub OAuth app (optional)

## Quick Start

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables

#### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=development
PORT=4000
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npm run prisma:seed
```

### 4. Supabase Storage Setup

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `fundify-media`
3. Make it **Public**
4. Add RLS policies:

```sql
-- Allow uploads
CREATE POLICY "Allow all uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'fundify-media');

-- Allow reads
CREATE POLICY "Allow all reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fundify-media');

-- Allow authenticated updates
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fundify-media');

-- Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fundify-media');
```

### 5. Run Development Servers

```bash
# Backend (from /backend)
npm run dev

# Frontend (from /frontend)
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Prisma Studio: `npx prisma studio`

## Production Deployment

### Railway (Backend)

1. Connect your GitHub repository
2. Add environment variables (same as .env above)
3. Railway will automatically:
   - Build: `npm run build`
   - Start: `npm run deploy` (runs migrations + starts server)

### Vercel (Frontend)

1. Connect your GitHub repository
2. Set environment variables
3. Vercel will automatically deploy

## Features

- ✅ User authentication (GitHub OAuth, JWT)
- ✅ Creator profiles with custom URLs
- ✅ Membership tiers and subscriptions
- ✅ Post creation with images/videos (Supabase storage)
- ✅ Like and comment system
- ✅ Stripe payment integration
- ✅ Real-time updates
- ✅ Responsive design

## Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Supabase Storage
- Stripe API

**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Axios

## Important Notes

### Media Storage
- All media (images/videos) are stored in **Supabase Storage**
- Files are permanent and will never be deleted
- Old files from local storage (before Supabase) are gone

### Database
- PostLike and PostComment tables are auto-created on first deploy
- Tables use RLS (Row Level Security) for data protection

### API Endpoints
- Base URL: `/api`
- Auth: `/api/auth/*`
- Users: `/api/users/*`
- Posts: `/api/posts/*`
- Upload: `/api/upload/*`
- Subscriptions: `/api/subscriptions/*`

## Troubleshooting

### Media files not uploading
1. Check SUPABASE_URL and SUPABASE_ANON_KEY in Railway
2. Verify bucket name is exactly `fundify-media`
3. Check RLS policies are set correctly
4. Check Railway logs for Supabase errors

### Database errors
1. Run `npx prisma migrate deploy` on Railway
2. Check DATABASE_URL is correct
3. Tables auto-create on server start via `create-tables.js`

### CORS errors
1. Check FRONTEND_URL in backend .env
2. Verify NEXT_PUBLIC_API_URL in frontend .env
3. Ensure CORS_ORIGIN is set correctly

## Support

For issues, check:
- Railway logs for backend errors
- Browser console for frontend errors
- Supabase dashboard for storage issues
- Prisma Studio for database inspection

---

Built with ❤️ for creators

