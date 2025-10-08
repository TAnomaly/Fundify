# Fundify Development Notes

## 🚀 Deployment Checklist

### Backend (Railway)
- **URL:** https://perfect-happiness-production.up.railway.app
- **Database:** Neon PostgreSQL
  ```
  postgresql://neondb_owner:npg_rRLz5k8qTHnc@ep-fancy-tooth-abl09hty-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
  ```
- **Start Command:** `npm run deploy` (runs migrations + starts server)
- **Build Script:** `npx prisma generate && tsc`
- **Deployment:** Automatic on push to main branch

#### Migration Workflow
```bash
# Create new migration
cd backend
npx prisma migrate dev --name migration_name

# Deploy to production (Railway does this automatically)
DATABASE_URL="..." npx prisma migrate deploy
```

### Frontend (Vercel)
- **URL:** https://funify.vercel.app
- **Root Directory:** `frontend`
- **Framework:** Next.js 15.5.4
- **Build Command:** `npm run build`
- **Deployment:** Automatic on push to main branch

#### Environment Variables (Set in Vercel Dashboard)
- `NEXT_PUBLIC_API_URL`: https://perfect-happiness-production.up.railway.app/api

## 🔧 Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (Neon)
- JWT Authentication
- Bcrypt for password hashing

### Frontend
- Next.js 15.5.4 (App Router)
- TypeScript
- Tailwind CSS
- React Hook Form + Zod
- Axios for API calls
- react-hot-toast for notifications

## 🎯 Current Features

### Authentication
- Email/Password registration and login
- GitHub OAuth integration
- JWT token-based auth
- Middleware protection for routes
- Auto-cleanup of expired tokens

### Campaign Types
1. **PROJECT** - GoFundMe style one-time campaigns
2. **CREATOR** - Patreon style creator pages
3. **CHARITY** - Charity fundraising

### Database Schema Highlights
- Users (with `isCreator` flag)
- Campaigns (with type: PROJECT/CREATOR/CHARITY)
- Donations (one-time payments)
- MembershipTiers (for creator subscriptions)
- Subscriptions (recurring payments)
- CreatorPost (exclusive content for subscribers)

## ⚠️ Important Notes

### JWT Token Management
- Tokens stored in both localStorage AND cookies
- Middleware validates token expiration server-side
- API interceptor cleans up expired tokens on 401
- Never redirect from login/register if already there

### Known Issues Fixed
1. ✅ Middleware redirect loop with expired tokens
2. ✅ Database migration not applied to production
3. ✅ Railway using dev mode instead of production
4. ✅ Token not being cleared from cookies on logout

### Protected Routes
- `/dashboard` - User dashboard
- `/campaigns/create` - Create new campaign
- `/creator-dashboard` - Creator hub (TODO: implement)

## 📝 Development Workflow

### Making Changes
1. Make changes locally
2. Test locally: `cd frontend && npm run dev` / `cd backend && npm run dev`
3. Commit: `git add . && git commit -m "message"`
4. Push: `git push`
5. Wait for Vercel/Railway auto-deploy (~1-2 min)

### Database Changes
1. Update `backend/prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev`
3. Test locally
4. Push to GitHub
5. Railway automatically runs migrations on deploy

## 🔐 Authentication Flow

```
1. User submits login form
2. Frontend calls authApi.login()
3. Backend validates credentials
4. Backend returns JWT token
5. Frontend saves token to localStorage + cookie via saveToken()
6. Middleware checks cookie for protected routes
7. API client adds token to Authorization header
8. On 401: Clear tokens + redirect to login
```

## 🚧 TODO / Future Features

### Creator Platform (NEXT PRIORITY)
- [ ] Stripe integration for payments
- [ ] Subscription management (create, cancel, upgrade)
- [ ] Exclusive content posts for subscribers
- [ ] Tiered membership system
- [ ] Creator analytics dashboard
- [ ] Payout system for creators

### Payment Integration
- [ ] Stripe Connect for creator payouts
- [ ] Subscription webhooks
- [ ] Payment history
- [ ] Refund system

### Content Management
- [ ] Rich text editor for posts
- [ ] Image/video upload (Cloudinary/S3)
- [ ] Post scheduling
- [ ] Draft system
- [ ] Content moderation

## 📊 Database Models Reference

### User
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  passwordHash  String?
  isCreator     Boolean   @default(false)
  creatorBio    String?
  socialLinks   Json?
  campaigns     Campaign[]
  donations     Donation[]
  subscriptions Subscription[]
}
```

### Campaign
```prisma
model Campaign {
  id           String        @id @default(uuid())
  title        String
  description  String
  goalAmount   Float
  currentAmount Float        @default(0)
  type         CampaignType  @default(PROJECT)
  userId       String
  user         User          @relation(...)
  donations    Donation[]
  tiers        MembershipTier[]
}
```

### MembershipTier
```prisma
model MembershipTier {
  id          String   @id @default(uuid())
  campaignId  String
  name        String
  description String?
  price       Float
  interval    SubscriptionInterval // MONTHLY, YEARLY
  benefits    Json?
  subscriptions Subscription[]
}
```

### Subscription
```prisma
model Subscription {
  id              String              @id @default(uuid())
  userId          String
  tierId          String
  status          SubscriptionStatus  // ACTIVE, CANCELLED, EXPIRED
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  stripeSubscriptionId String?
}
```

### CreatorPost
```prisma
model CreatorPost {
  id         String   @id @default(uuid())
  campaignId String
  title      String
  content    String
  isPublic   Boolean  @default(false)
  requiredTierId String? // null = all subscribers, specific tier = only that tier+
  createdAt  DateTime @default(now())
}
```

## 🎨 Design System

### Color Scheme
- Primary: Purple-Blue gradient
- Success: Green
- Error: Red
- Muted: Gray

### Key Classes
- `text-gradient` - Gradient text effect
- `bg-gradient-primary` - Primary gradient background
- `shadow-soft` - Soft shadow
- `bg-glass-card` - Glass morphism card

## 🔍 Debugging

### Check Token Status
```javascript
// In browser console
localStorage.getItem('authToken')
document.cookie
```

### Clear Auth State
```javascript
localStorage.clear()
document.cookie = 'authToken=; path=/; max-age=0'
location.reload()
```

### API Testing
```bash
# Test backend health
curl https://perfect-happiness-production.up.railway.app/api/health

# Test login
curl -X POST https://perfect-happiness-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123"}'
```

## 📌 Git Commit Convention

```
feat: New feature
fix: Bug fix
perf: Performance improvement
refactor: Code refactoring
docs: Documentation
style: Code style/formatting
test: Testing
chore: Maintenance

Example:
feat: Add Stripe subscription integration
fix: Resolve token expiration redirect loop
perf: Optimize campaign query with indexes
```

---

**Last Updated:** 2025-10-08
**Current Version:** v1.0 (Pre-Production)
**Status:** Active Development - Creator Platform Phase
