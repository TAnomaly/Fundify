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

#### Required Environment Variables
```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=4000
NODE_ENV="production"
CORS_ORIGIN="https://funify.vercel.app"
FRONTEND_URL="https://funify.vercel.app"

# Stripe Integration
STRIPE_SECRET_KEY="sk_test_..."  # Use sk_live_... in production
STRIPE_PUBLISHABLE_KEY="pk_test_..."  # Use pk_live_... in production
STRIPE_WEBHOOK_SECRET="whsec_..."  # Get from Stripe Dashboard webhook endpoint
```

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
```bash
NEXT_PUBLIC_API_URL="https://perfect-happiness-production.up.railway.app/api"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."  # Same as backend
```

## 🔧 Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (Neon)
- JWT Authentication
- Bcrypt for password hashing
- **Stripe SDK** for subscription payments

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

## 💳 Stripe Integration

### Setup Completed ✅
- Stripe SDK installed and configured
- Database schema updated with Stripe fields
- Webhook handlers implemented
- Local testing successful with Stripe CLI

### Stripe Webhook Configuration

**Production Webhook Endpoint:**
```
https://perfect-happiness-production.up.railway.app/api/webhooks/stripe
```

**Events to Listen To:**
- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription initialized
- `customer.subscription.updated` - Subscription status changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

**Get Webhook Secret:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint with URL above
3. Select all events listed
4. Copy signing secret (starts with `whsec_`)
5. Add to Railway environment as `STRIPE_WEBHOOK_SECRET`

### Testing Locally with Stripe CLI

```bash
# Install Stripe CLI
wget https://github.com/stripe/stripe-cli/releases/download/v1.31.0/stripe_1.31.0_linux_x86_64.tar.gz
tar -xvf stripe_1.31.0_linux_x86_64.tar.gz

# Login to Stripe
./stripe login

# Start webhook forwarding
./stripe listen --forward-to localhost:4000/api/webhooks/stripe

# In another terminal, trigger test events
./stripe trigger checkout.session.completed
./stripe trigger customer.subscription.updated
./stripe trigger invoice.payment_succeeded
```

### API Endpoints

**Stripe Integration:**
- `POST /api/stripe/create-checkout-session` - Create subscription checkout
- `POST /api/stripe/create-portal-session` - Customer billing portal
- `GET /api/stripe/config` - Get publishable key
- `POST /api/webhooks/stripe` - Webhook handler (raw body)

**Membership Tiers:**
- `POST /api/memberships/campaigns/:id/tiers` - Create tier
- `GET /api/memberships/campaigns/:id/tiers` - List tiers
- `PUT /api/memberships/tiers/:id` - Update tier
- `DELETE /api/memberships/tiers/:id` - Delete tier

**Subscriptions:**
- `GET /api/subscriptions/my-subscriptions` - User's subscriptions
- `GET /api/subscriptions/my-subscribers` - Creator's subscribers
- `POST /api/subscriptions/:id/cancel` - Cancel subscription

### Payment Flow

1. User clicks "Subscribe" on tier → Frontend calls `create-checkout-session`
2. Backend creates Stripe Checkout session → Returns session URL
3. User redirected to Stripe Checkout → Enters payment details
4. Payment successful → Stripe sends `checkout.session.completed` webhook
5. Backend creates subscription in database → Updates subscriber count
6. User redirected to success page → Can access exclusive content

### Test Cards

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Failed Payment:**
- Card: `4000 0000 0000 0341`

**Requires Authentication:**
- Card: `4000 0025 0000 3155`

### Database Schema

```prisma
model User {
  stripeCustomerId         String?  @unique
  stripeAccountId          String?  @unique
  stripeOnboardingComplete Boolean  @default(false)
}

model Subscription {
  stripeSubscriptionId String?  @unique
  stripeCustomerId     String?
  status               SubscriptionStatus
  nextBillingDate      DateTime
}
```

### Troubleshooting

**Webhook not receiving events:**
- Check Railway logs for errors
- Verify webhook secret matches Stripe Dashboard
- Ensure endpoint URL is correct
- Check Stripe Dashboard → Webhooks → Recent events for failed deliveries

**Checkout session creation fails:**
- Verify user is authenticated
- Check tier exists and is active
- Ensure no duplicate active subscription
- Check Railway logs for detailed error

**Payment succeeded but subscription not created:**
- Check webhook was received (Railway logs)
- Verify webhook signature is valid
- Check database for subscription record
- Look for errors in webhook handler logs

---

**Last Updated:** 2025-10-08
**Current Version:** v1.0 (Pre-Production)
**Status:** Active Development - Stripe Integration Complete ✅
**Next:** Frontend Subscription UI
