# Database Migration Instructions

## Run Migration After Deployment

After your code is deployed to Railway, you need to run the database migration to add the ticket columns to the EventRSVP table.

### Option 1: Run via Railway CLI

```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the migration script
railway run node add-ticket-columns.js
```

### Option 2: Run via Railway Dashboard

1. Go to your Railway dashboard: https://railway.app
2. Select your backend service
3. Go to the "Deployments" tab
4. Click on the latest deployment
5. Click "View Logs"
6. In another tab, go to "Settings" → "Networking" → "Private Networking"
7. Copy the DATABASE_URL connection string
8. Go to your local terminal and run:

```bash
cd backend
DATABASE_URL="<paste-railway-database-url>" node add-ticket-columns.js
```

### Option 3: Use Railway's One-off Command

1. Go to Railway dashboard
2. Select your backend service
3. Click "Settings" → "General"
4. Find "Service Start Command"
5. Temporarily change it to: `node add-ticket-columns.js && npm start`
6. Wait for deployment
7. Change it back to: `npm start`

### Option 4: SSH into Railway Container

```bash
# Via Railway CLI
railway shell

# Then run
node add-ticket-columns.js
```

## Verify Migration Success

The script will output:
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

## What This Migration Does

Adds the following columns to the `EventRSVP` table:
- `ticketCode` - Unique UUID for QR code tickets
- `isPaid` - Boolean to track if user paid for premium event
- `paymentId` - Stripe payment intent ID
- `checkedIn` - Boolean to track if attendee checked in
- `checkedInAt` - Timestamp of check-in
- `checkedInBy` - ID of staff member who checked them in

Plus indexes and constraints for performance and data integrity.

## Troubleshooting

If you see "already exists" messages, that's normal - it means the columns were already added in a previous run.

If you see connection errors, make sure your DATABASE_URL environment variable is correctly set to your production PostgreSQL database.
