# 🚀 Deployment Steps for Payment Integration

## Current Status
✅ Code pushed to GitHub (commits: QR scanner + Payment integration)
⏳ Vercel & Railway are auto-deploying now
⚠️ Need to run database migration after deployment

---

## Step 1: Wait for Deployment (5-10 minutes)

Your code is being deployed automatically:
- **Vercel** (Frontend): Check https://vercel.com/dashboard
- **Railway** (Backend): Check https://railway.app/dashboard

Wait until both show "Deployed" status.

---

## Step 2: Run Database Migration

Once Railway backend is deployed, run the migration to add ticket columns:

### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh
# OR
npm i -g @railway/cli

# Login to Railway
railway login

# Navigate to backend folder
cd ~/Desktop/fundify/backend

# Link to your Railway project (if not already linked)
railway link

# Run the migration
railway run node add-ticket-columns.js
```

### Option B: Using Railway Dashboard Variables

1. Go to https://railway.app/dashboard
2. Click on your **backend** service
3. Go to **Variables** tab
4. Copy the `DATABASE_URL` value
5. Run locally:

```bash
cd ~/Desktop/fundify/backend
DATABASE_URL="<paste-railway-url>" node add-ticket-columns.js
```

### Option C: Direct Railway Shell

```bash
# Via Railway CLI
railway shell

# Then run
cd backend
node add-ticket-columns.js
exit
```

---

## Step 3: Verify Migration

You should see:
```
Adding ticket columns to EventRSVP table...
✓ Added ticketCode column
✓ Added isPaid column
✓ Added paymentId column
✓ Added checkedIn column
✓ Added checkedInAt column
✓ Added checkedInBy column
✓ Added unique constraint on ticketCode
✓ Created index on ticketCode
✓ Created index on checkedIn

✅ Migration completed successfully!
```

---

## Step 4: Test the Features

### Test QR Scanner:
1. Go to one of your events
2. RSVP as GOING
3. Click "View My Ticket"
4. See your QR code
5. As event host, go to `/events/{id}/checkin`
6. Scan the QR code
7. Verify check-in works

### Test Payment Integration:
1. Create a new event with:
   - Check "Premium Event"
   - Set a price (e.g., $10)
2. As a different user, go to that event
3. Click "I'm Going" button
4. Payment modal should appear
5. Use Stripe test card: `4242 4242 4242 4242`
6. Expiry: Any future date (e.g., 12/34)
7. CVC: Any 3 digits (e.g., 123)
8. Complete payment
9. Verify you get the ticket
10. Try to buy again - should prevent duplicate

---

## Step 5: Environment Variables Check

Make sure these are set in Railway:

```
DATABASE_URL=<auto-set-by-railway>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

And in Vercel:

```
NEXT_PUBLIC_API_URL=<your-railway-backend-url>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Troubleshooting

### "Column already exists" error
This is fine! It means the migration already ran. Skip to testing.

### "Can't reach database" error
- Make sure DATABASE_URL is correct
- Check Railway service is running
- Verify database is connected in Railway dashboard

### Payment not working
- Check Stripe keys are set in Railway variables
- Verify NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is in Vercel
- Check browser console for errors
- Make sure you're using test mode keys (sk_test_ / pk_test_)

### QR Scanner not opening camera
- Grant camera permissions in browser
- Try in HTTPS (production) not HTTP (localhost)
- Use Chrome/Edge (best compatibility)

---

## Quick Test Commands

```bash
# Check if Railway is linked
railway status

# View Railway logs
railway logs

# Check database connection
railway run npx prisma db pull

# Regenerate Prisma client on Railway
railway run npx prisma generate
```

---

## Need Help?

Check the logs:
- **Railway Backend**: `railway logs --tail`
- **Vercel Frontend**: Vercel Dashboard → Your Project → Deployments → View Function Logs

---

## Summary of What Was Added

✅ QR code ticketing system
✅ QR scanner page for event hosts
✅ Stripe payment integration for premium events
✅ Payment modal with secure checkout
✅ Ticket purchase prevention for duplicate payments
✅ Database migration script for EventRSVP columns

All ready to go! 🎉
