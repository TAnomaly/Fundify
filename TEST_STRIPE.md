# Stripe Integration Test Guide

## ✅ Setup Completed

### Backend Environment Variables (Railway)
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_PUBLISHABLE_KEY
- ✅ FRONTEND_URL
- ✅ STRIPE_WEBHOOK_SECRET

### Stripe Webhook Endpoint
- URL: `https://perfect-happiness-production.up.railway.app/api/webhooks/stripe`
- Secret: `whsec_yeJ0JFRrLcC5nLsm3XlGgvbUy0dQZ4v7`
- Events listening to:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed

## 🧪 Test Steps

### 1. Test Backend Health
```bash
curl https://perfect-happiness-production.up.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.456
}
```

### 2. Test Stripe Config Endpoint
```bash
curl https://perfect-happiness-production.up.railway.app/api/stripe/config
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "publishableKey": "pk_test_51SFzsr0izq3yR5HHK1Usb3KACAEcOkJHAEfrToxkEeMv6ZuFyTlKAGJqGuGW6N1efxmHI90qQrFdo3I7Ofgqoikc00FQRFgmv8"
  }
}
```

### 3. Create Test Creator Campaign

First, register a user and get token:
```bash
curl -X POST https://perfect-happiness-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@test.com",
    "password": "Creator123",
    "name": "Test Creator"
  }'
```

**Save the token from response.**

Update user to be a creator:
```bash
# You'll need to do this via database or create a new endpoint
```

Create a CREATOR campaign:
```bash
curl -X POST https://perfect-happiness-production.up.railway.app/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Creator Page",
    "description": "Testing membership tiers",
    "story": "This is a test creator page for subscription testing. Support me monthly!",
    "type": "CREATOR",
    "category": "CREATIVE",
    "goalAmount": 1000,
    "coverImage": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c",
    "endDate": "2026-12-31T23:59:59.000Z"
  }'
```

**Save the campaignId from response.**

### 4. Create Membership Tiers

```bash
# Basic Tier
curl -X POST https://perfect-happiness-production.up.railway.app/api/memberships/campaigns/CAMPAIGN_ID/tiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Basic Supporter",
    "description": "Get access to exclusive posts",
    "price": 5,
    "interval": "MONTHLY",
    "perks": ["Exclusive posts", "Early access"],
    "position": 1
  }'

# Premium Tier
curl -X POST https://perfect-happiness-production.up.railway.app/api/memberships/campaigns/CAMPAIGN_ID/tiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Premium Supporter",
    "description": "All benefits plus priority support",
    "price": 10,
    "interval": "MONTHLY",
    "perks": ["All Basic perks", "Priority support", "Behind the scenes"],
    "position": 2
  }'
```

**Save tierIds from responses.**

### 5. Test Checkout Session Creation

Register a subscriber user:
```bash
curl -X POST https://perfect-happiness-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscriber@test.com",
    "password": "Sub123",
    "name": "Test Subscriber"
  }'
```

Create checkout session:
```bash
curl -X POST https://perfect-happiness-production.up.railway.app/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSCRIBER_TOKEN" \
  -d '{
    "tierId": "TIER_ID",
    "creatorId": "CREATOR_USER_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/c/pay/..."
  }
}
```

### 6. Complete Payment Flow

1. Open the checkout URL in browser
2. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
3. Complete payment
4. Should redirect to success page

### 7. Verify Webhook Received

Check Railway logs:
```bash
# Look for these logs:
Received webhook: checkout.session.completed
Processing checkout.session.completed: cs_test_...
Subscription created: sub_...
```

### 8. Verify Subscription in Database

```bash
curl https://perfect-happiness-production.up.railway.app/api/subscriptions/my-subscriptions \
  -H "Authorization: Bearer SUBSCRIBER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "status": "ACTIVE",
      "tier": {
        "name": "Basic Supporter",
        "price": 5
      },
      "creator": {
        "name": "Test Creator"
      }
    }
  ]
}
```

### 9. Test Creator Dashboard

```bash
curl https://perfect-happiness-production.up.railway.app/api/subscriptions/my-subscribers \
  -H "Authorization: Bearer CREATOR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "subscriber": {
          "name": "Test Subscriber",
          "email": "subscriber@test.com"
        },
        "tier": {
          "name": "Basic Supporter",
          "price": 5
        }
      }
    ],
    "stats": {
      "totalSubscribers": 1,
      "monthlyRevenue": 5
    }
  }
}
```

### 10. Test Webhook with Stripe CLI (Optional)

If you want to test webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

## 🐛 Troubleshooting

### Webhook Not Receiving Events

1. Check Stripe Dashboard → Webhooks → Your endpoint
2. Look at "Recent events" tab
3. Check for failed deliveries and error messages
4. Verify endpoint URL is correct
5. Check Railway logs for errors

### Checkout Session Creation Fails

- Verify user is authenticated (valid token)
- Verify tier exists and is active
- Check tier has not reached max subscribers
- Verify user doesn't already have active subscription to that creator

### Subscription Not Created After Payment

- Check Railway logs for webhook processing
- Verify webhook signature is correct
- Check database for subscription record
- Look for errors in webhook handler

### Database Connection Issues

```bash
# Test database connection
curl https://perfect-happiness-production.up.railway.app/api/health
```

## 📊 Success Criteria

- ✅ Backend health check passes
- ✅ Stripe config endpoint returns publishable key
- ✅ Creator can create membership tiers
- ✅ Checkout session URL is generated
- ✅ Test payment completes successfully
- ✅ Webhook receives checkout.session.completed event
- ✅ Subscription is created in database
- ✅ Subscriber sees active subscription
- ✅ Creator sees subscriber in dashboard
- ✅ Monthly revenue is calculated correctly

## 🎯 Next Steps After Testing

1. **Frontend Integration:**
   - Create subscription UI components
   - Integrate Stripe Checkout
   - Build creator dashboard
   - Display subscriber list

2. **Additional Features:**
   - Cancel subscription flow
   - Upgrade/downgrade tiers
   - Billing portal integration
   - Email notifications

3. **Production Preparation:**
   - Switch to live Stripe keys
   - Update webhook endpoint to production
   - Test with real payment methods
   - Set up monitoring and alerts

---

**Test Date:** 2025-10-08
**Status:** Ready for Testing
**Backend:** https://perfect-happiness-production.up.railway.app
**Frontend:** https://funify.vercel.app
