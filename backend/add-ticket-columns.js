const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addEventRSVPColumns() {
  try {
    console.log('Adding ticket columns to EventRSVP table...');
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');

    // Add columns one by one (PostgreSQL doesn't support IF NOT EXISTS in ADD COLUMN with multiple columns)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD COLUMN "ticketCode" TEXT DEFAULT gen_random_uuid()::text;
      `);
      console.log('✓ Added ticketCode column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- ticketCode column already exists');
      } else throw e;
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✓ Added isPaid column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- isPaid column already exists');
      } else throw e;
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD COLUMN "paymentId" TEXT;
      `);
      console.log('✓ Added paymentId column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- paymentId column already exists');
      } else throw e;
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD COLUMN "checkedIn" BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('✓ Added checkedIn column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- checkedIn column already exists');
      } else throw e;
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD COLUMN "checkedInAt" TIMESTAMP(3);
      `);
      console.log('✓ Added checkedInAt column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- checkedInAt column already exists');
      } else throw e;
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD COLUMN "checkedInBy" TEXT;
      `);
      console.log('✓ Added checkedInBy column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- checkedInBy column already exists');
      } else throw e;
    }

    // Add unique constraint on ticketCode
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_ticketCode_key" UNIQUE ("ticketCode");
      `);
      console.log('✓ Added unique constraint on ticketCode');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- Unique constraint on ticketCode already exists');
      } else throw e;
    }

    // Add indexes
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "EventRSVP_ticketCode_idx" ON "EventRSVP"("ticketCode");
      `);
      console.log('✓ Created index on ticketCode');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- Index on ticketCode already exists');
      } else throw e;
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "EventRSVP_checkedIn_idx" ON "EventRSVP"("checkedIn");
      `);
      console.log('✓ Created index on checkedIn');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('- Index on checkedIn already exists');
      } else throw e;
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addEventRSVPColumns();
