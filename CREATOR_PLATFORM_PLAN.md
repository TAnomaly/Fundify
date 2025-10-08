# 🎨 Creator Platform Implementation Plan

## Overview
Patreon-style subscription platform where creators can:
- Create membership tiers with different prices
- Post exclusive content for subscribers
- Get recurring monthly/yearly payments via Stripe
- Manage subscribers and earnings

## 📋 Phase 1: Stripe Integration (PRIORITY)

### 1.1 Backend Setup

#### Environment Variables Needed
```env
# Backend .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...  # For frontend
FRONTEND_URL=https://funify.vercel.app
```

#### Install Dependencies
```bash
cd backend
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

### 1.2 Stripe Configuration Files

**File:** `backend/src/config/stripe.ts`
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const STRIPE_CONFIG = {
  currency: 'usd',
  successUrl: `${process.env.FRONTEND_URL}/subscription/success`,
  cancelUrl: `${process.env.FRONTEND_URL}/subscription/cancelled`,
};
```

**File:** `backend/src/routes/stripe.routes.ts`
```typescript
// Create checkout session
// Handle webhooks
// Manage subscriptions
// Customer portal
```

### 1.3 Database Updates Needed

✅ Already in schema:
- MembershipTier model with price, interval
- Subscription model with stripeSubscriptionId, stripeCustomerId
- CreatorPost model for exclusive content

❌ Need to add to User model:
```prisma
model User {
  // ... existing fields
  stripeAccountId      String?  @unique  // For Stripe Connect payouts
  stripeCustomerId     String?  @unique  // For customer payments
  stripeOnboardingComplete Boolean @default(false)
}
```

### 1.4 API Endpoints to Create

#### Membership Tiers
```
POST   /api/campaigns/:id/tiers          - Create tier
GET    /api/campaigns/:id/tiers          - List tiers
PUT    /api/campaigns/:id/tiers/:tierId  - Update tier
DELETE /api/campaigns/:id/tiers/:tierId  - Delete tier
```

#### Subscriptions
```
POST   /api/subscriptions/create         - Create checkout session
GET    /api/subscriptions/me             - My subscriptions
POST   /api/subscriptions/:id/cancel     - Cancel subscription
POST   /api/subscriptions/:id/resume     - Resume subscription
GET    /api/subscriptions/:id/portal     - Get Stripe portal URL
```

#### Creator Posts
```
POST   /api/posts                        - Create post
GET    /api/posts/:creatorId             - List creator posts (filtered by access)
GET    /api/posts/:id                    - Get single post (check access)
PUT    /api/posts/:id                    - Update post
DELETE /api/posts/:id                    - Delete post
```

#### Stripe Webhooks
```
POST   /api/webhooks/stripe              - Handle Stripe events
```

### 1.5 Stripe Webhook Events to Handle

```typescript
// Critical events
'checkout.session.completed'      // New subscription created
'customer.subscription.updated'   // Subscription changed
'customer.subscription.deleted'   // Subscription cancelled
'invoice.payment_succeeded'       // Payment successful
'invoice.payment_failed'          // Payment failed

// Payout events (for Stripe Connect)
'account.updated'                 // Creator account status changed
'payout.paid'                     // Payout completed
'payout.failed'                   // Payout failed
```

---

## 📋 Phase 2: Creator Dashboard UI

### 2.1 Pages to Create

#### `/creator-dashboard` - Main Creator Hub
- Overview stats (subscribers, MRR, total earnings)
- Recent subscribers list
- Quick actions (create post, manage tiers)
- Earnings chart (by month)

#### `/creator-dashboard/tiers` - Manage Membership Tiers
- Create/edit/delete tiers
- Drag-and-drop reordering
- Set prices, benefits, limits
- Preview how tiers look to users

#### `/creator-dashboard/posts` - Content Management
- List all posts with filters (public/private, tier)
- Create new post with rich text editor
- Schedule posts
- Draft system

#### `/creator-dashboard/subscribers` - Subscriber Management
- List all active subscribers
- Filter by tier
- Export subscriber list
- Send bulk messages (future)

#### `/creator-dashboard/earnings` - Financial Dashboard
- Total earnings (all time, monthly, yearly)
- Breakdown by tier
- Payout history
- Request payout button

#### `/creator-dashboard/settings` - Creator Settings
- Stripe Connect onboarding
- Bank account setup
- Creator profile (bio, social links)
- Notification preferences

### 2.2 Components to Build

**TierCard.tsx** - Display membership tier
```tsx
- Tier name, price, interval
- List of perks
- Subscribe button
- Subscriber count
- "Most Popular" badge
```

**PostEditor.tsx** - Rich text editor for posts
```tsx
- WYSIWYG editor (TipTap or Slate)
- Image upload
- Video embed
- Access level selector
- Publish/Draft toggle
```

**SubscriberList.tsx** - Table of subscribers
```tsx
- Avatar, name, email
- Tier badge
- Join date
- Status (active/cancelled)
- Actions (message, manage)
```

**EarningsChart.tsx** - Revenue visualization
```tsx
- Line chart of MRR over time
- Bar chart by tier
- Total earnings counter
```

**StripeConnectButton.tsx** - Onboarding flow
```tsx
- "Connect with Stripe" button
- Onboarding status indicator
- Redirect to Stripe Connect
- Handle return from Stripe
```

---

## 📋 Phase 3: Subscriber (Fan) Experience

### 3.1 Pages to Create

#### `/creators/:username` - Creator Profile Page
- Creator bio, avatar, social links
- Subscriber count, total raised
- Membership tiers display
- Recent public posts preview
- "Become a Subscriber" CTA

#### `/creators/:username/posts` - Creator Feed
- List of posts (public + accessible private)
- Locked post previews for non-subscribers
- Filter by tier
- Pagination

#### `/creators/:username/subscribe` - Subscription Checkout
- Display selected tier
- Stripe Checkout embedded
- Price breakdown
- Terms and conditions

#### `/subscriptions` - My Subscriptions Page
- List all active subscriptions
- Manage each subscription
- Access exclusive posts
- Billing history
- Cancel/Resume buttons

#### `/subscription/success` - Success Page
- Thank you message
- Next steps (access posts)
- Share on social media
- Email confirmation notice

### 3.2 Features

**Subscription Status Indicator**
- Badge on creator profile showing if subscribed
- Tier name and benefits unlocked

**Content Access Control**
- Lock icon on restricted posts
- "Subscribe to view" overlay
- Tier upgrade prompt if on lower tier

**Billing Management**
- Update payment method
- View invoices
- Download receipts
- Manage renewal settings

---

## 📋 Phase 4: Payment Flow (Step-by-Step)

### Subscription Creation Flow
```
1. User clicks "Subscribe" on tier card
   ↓
2. Frontend calls POST /api/subscriptions/create
   {
     tierId: "tier-uuid",
     interval: "MONTHLY"
   }
   ↓
3. Backend creates Stripe Checkout Session
   - Creates/reuses Stripe Customer
   - Sets up Subscription
   - Returns checkout session URL
   ↓
4. Frontend redirects to Stripe Checkout
   ↓
5. User enters payment info on Stripe
   ↓
6. Stripe redirects to /subscription/success
   ↓
7. Stripe sends webhook: checkout.session.completed
   ↓
8. Backend webhook handler:
   - Verifies webhook signature
   - Creates Subscription record in DB
   - Updates MembershipTier.currentSubscribers
   - Sends welcome email to subscriber
   ↓
9. User sees success page and can access content
```

### Payment Processing Flow (Monthly)
```
1. Stripe automatically charges subscriber
   ↓
2. Stripe sends webhook: invoice.payment_succeeded
   ↓
3. Backend updates Subscription.nextBillingDate
   ↓
4. Creator sees updated MRR in dashboard
   ↓
5. Funds accumulate in creator's Stripe account
```

### Payout Flow (Stripe Connect)
```
1. Creator clicks "Request Payout" in dashboard
   ↓
2. Backend calculates available balance
   ↓
3. Creates Stripe Transfer/Payout
   ↓
4. Funds sent to creator's bank account (2-7 days)
   ↓
5. Stripe sends webhook: payout.paid
   ↓
6. Backend records payout in database
   ↓
7. Creator receives email confirmation
```

---

## 📋 Phase 5: Security & Best Practices

### Authentication Checks
```typescript
// Middleware to check if user is creator
export const isCreator = async (req, res, next) => {
  if (!req.user.isCreator) {
    return res.status(403).json({ error: 'Creator access required' });
  }
  next();
};

// Middleware to check if user owns campaign
export const isCampaignOwner = async (req, res, next) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.campaignId },
  });
  if (campaign.creatorId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
};

// Middleware to check subscription access
export const hasSubscriptionAccess = async (req, res, next) => {
  const post = await prisma.creatorPost.findUnique({
    where: { id: req.params.postId },
    include: { author: true },
  });

  if (post.isPublic) return next();

  const subscription = await prisma.subscription.findFirst({
    where: {
      subscriberId: req.user.id,
      creatorId: post.authorId,
      status: 'ACTIVE',
    },
    include: { tier: true },
  });

  if (!subscription) {
    return res.status(403).json({ error: 'Subscription required' });
  }

  // Check tier level if post requires specific tier
  if (post.minimumTierId) {
    // Implement tier hierarchy check
  }

  next();
};
```

### Webhook Security
```typescript
// Verify Stripe webhook signature
const verifyStripeWebhook = (req) => {
  const signature = req.headers['stripe-signature'];
  try {
    return stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new Error('Webhook signature verification failed');
  }
};
```

### Data Validation
```typescript
// Tier creation validation
const tierSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  price: z.number().min(1).max(10000),
  interval: z.enum(['MONTHLY', 'YEARLY']),
  perks: z.array(z.string()).min(1).max(10),
  maxSubscribers: z.number().optional(),
});
```

---

## 📋 Phase 6: Testing Checklist

### Stripe Test Mode
- Use test credit cards: 4242 4242 4242 4242
- Test successful subscription
- Test failed payment (4000 0000 0000 0341)
- Test subscription cancellation
- Test webhook delivery

### User Flows to Test
- [ ] Creator creates membership tiers
- [ ] Creator creates private post
- [ ] User subscribes to tier
- [ ] User accesses exclusive content
- [ ] User cancels subscription
- [ ] User re-subscribes
- [ ] Creator receives payout
- [ ] Creator updates tier prices
- [ ] Multiple tiers per creator
- [ ] Tier upgrade/downgrade

### Edge Cases
- [ ] User subscribes twice to same creator
- [ ] Creator deletes tier with active subscribers
- [ ] Payment fails during renewal
- [ ] Webhook arrives out of order
- [ ] User deletes account with active subscription
- [ ] Creator deletes account with active subscribers

---

## 📋 Phase 7: Deployment Steps

### Backend Environment Variables
```bash
# Railway Dashboard
STRIPE_SECRET_KEY=sk_live_...  # Switch to live key in production
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
FRONTEND_URL=https://funify.vercel.app
```

### Frontend Environment Variables
```bash
# Vercel Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_API_URL=https://perfect-happiness-production.up.railway.app/api
```

### Stripe Setup
1. Create Stripe account (or use existing)
2. Enable Stripe Connect (Express accounts)
3. Create webhook endpoint: `https://perfect-happiness-production.up.railway.app/api/webhooks/stripe`
4. Select events to listen to (listed in Phase 1.5)
5. Copy webhook secret to Railway env vars
6. Test in Stripe test mode first

### Database Migration
```bash
# Add Stripe fields to User model
npx prisma migrate dev --name add_stripe_fields
npx prisma migrate deploy  # Production
```

---

## 📊 Success Metrics

### KPIs to Track
- Total active subscriptions
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Churn rate (cancelled subscriptions %)
- Creator signup rate
- Subscriber to creator conversion
- Payment success rate
- Average tier price

### Analytics Events to Track
```typescript
// Analytics.track() calls
'subscription_created'
'subscription_cancelled'
'post_created'
'post_viewed'
'tier_created'
'payout_requested'
'creator_onboarded'
```

---

## 🚀 Quick Start Commands

### Development
```bash
# Start backend with Stripe webhooks
cd backend
npm run dev

# In another terminal, forward Stripe webhooks
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# Start frontend
cd frontend
npm run dev
```

### Testing Stripe
```bash
# Trigger test webhook
stripe trigger checkout.session.completed

# View webhook logs
stripe logs tail
```

---

## 📚 Resources

### Stripe Documentation
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhook Events](https://stripe.com/docs/api/events/types)

### Implementation Examples
- [Stripe Node.js Examples](https://github.com/stripe-samples/subscription-use-cases)
- [Next.js Stripe Integration](https://vercel.com/guides/getting-started-with-nextjs-typescript-stripe)

---

## ✅ Implementation Checklist

### Phase 1: Backend (2-3 days)
- [ ] Install Stripe packages
- [ ] Create stripe.ts config file
- [ ] Add Stripe fields to User model (migration)
- [ ] Create tier CRUD endpoints
- [ ] Create subscription endpoints
- [ ] Implement webhook handler
- [ ] Test with Stripe CLI

### Phase 2: Creator Dashboard (3-4 days)
- [ ] Create creator dashboard layout
- [ ] Build tier management page
- [ ] Build post creation page
- [ ] Build subscriber list page
- [ ] Build earnings dashboard
- [ ] Stripe Connect onboarding flow

### Phase 3: Fan Experience (2-3 days)
- [ ] Creator profile page
- [ ] Tier selection UI
- [ ] Stripe Checkout integration
- [ ] Post feed with access control
- [ ] Subscription management page
- [ ] Success/cancel pages

### Phase 4: Testing & Polish (2 days)
- [ ] Test all payment flows
- [ ] Test webhook handling
- [ ] Test access control
- [ ] Fix bugs
- [ ] UI polish
- [ ] Mobile responsive

### Phase 5: Production Deployment (1 day)
- [ ] Set up production Stripe account
- [ ] Configure webhook endpoint
- [ ] Update environment variables
- [ ] Deploy backend (Railway)
- [ ] Deploy frontend (Vercel)
- [ ] End-to-end testing in production

**Total Estimated Time:** 10-13 days

---

**Last Updated:** 2025-10-08
**Status:** Planning Phase - Ready to implement
**Next Step:** Phase 1 - Stripe Backend Integration
