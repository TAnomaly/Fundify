// Simple script to create PostLike and PostComment tables
const { PrismaClient } = require('@prisma/client');

async function createTables() {
  console.log('🔧 Checking database tables...\n');

  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping table creation (this is OK during build)');
    process.exit(0);
  }

  const prisma = new PrismaClient();

  try {
    // Add bannerImage to User table if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "User" ADD COLUMN "bannerImage" TEXT;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
    console.log('✅ User bannerImage column added');

    // Create PostType enum if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "PostType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'MIXED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ PostType enum created/verified');

    // Add type and audioUrl columns to CreatorPost if not exists
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "CreatorPost" ADD COLUMN "type" "PostType" NOT NULL DEFAULT 'TEXT';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "CreatorPost" ADD COLUMN "audioUrl" TEXT;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CreatorPost_type_idx" ON "CreatorPost"("type");
    `);
    console.log('✅ CreatorPost columns updated');

    // Create PostLike table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PostLike" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ PostLike table created');

    // Create PostComment table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PostComment" (
        "id" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ PostComment table created');

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_userId_postId_key" ON "PostLike"("userId", "postId");`);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PostComment_createdAt_idx" ON "PostComment"("createdAt");`);

    console.log('✅ Indexes created');

    // Add foreign keys
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostLike_userId_fkey') THEN
            ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostLike_postId_fkey') THEN
            ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" 
            FOREIGN KEY ("postId") REFERENCES "CreatorPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostComment_userId_fkey') THEN
            ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostComment_postId_fkey') THEN
            ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" 
            FOREIGN KEY ("postId") REFERENCES "CreatorPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      console.log('✅ Foreign keys created');
    } catch (e) {
      console.log('⚠️  Foreign keys may already exist');
    }

    console.log('\n🎉 All tables created successfully!\n');

    // Test
    const likeCount = await prisma.postLike.count();
    const commentCount = await prisma.postComment.count();
    console.log(`📊 Current data: ${likeCount} likes, ${commentCount} comments`);

    // Create new enums for blog/events (if not exist)
    console.log('\n📝 Setting up Blog & Events enums...');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "EventType" AS ENUM ('VIRTUAL', 'IN_PERSON', 'HYBRID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "RSVPStatus" AS ENUM ('GOING', 'MAYBE', 'NOT_GOING');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Blog & Events enums created!');

    // Create Event table
    console.log('\n📅 Creating Event table...');
    
    // Drop existing Event tables to recreate with correct schema
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "EventReminder" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "EventRSVP" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Event" CASCADE;`);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Event" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "coverImage" TEXT,
        "type" "EventType" NOT NULL,
        "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "timezone" TEXT NOT NULL DEFAULT 'UTC',
        "location" TEXT,
        "virtualLink" TEXT,
        "maxAttendees" INTEGER,
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "isPremium" BOOLEAN NOT NULL DEFAULT false,
        "minimumTierId" TEXT,
        "price" DOUBLE PRECISION DEFAULT 0,
        "agenda" TEXT,
        "tags" TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "hostId" TEXT NOT NULL,
        CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create EventRSVP table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "EventRSVP" (
        "id" TEXT NOT NULL,
        "status" "RSVPStatus" NOT NULL DEFAULT 'GOING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create EventReminder table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "EventReminder" (
        "id" TEXT NOT NULL,
        "reminderAt" TIMESTAMP(3) NOT NULL,
        "sent" BOOLEAN NOT NULL DEFAULT false,
        "sentAt" TIMESTAMP(3),
        "userId" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Event_hostId_idx" ON "Event"("hostId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event"("status");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Event_startTime_idx" ON "Event"("startTime");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EventRSVP_userId_eventId_key" ON "EventRSVP"("userId", "eventId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EventRSVP_eventId_idx" ON "EventRSVP"("eventId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EventReminder_eventId_idx" ON "EventReminder"("eventId");`);

    console.log('✅ Event tables created!');
    console.log('✅ All database setup complete! Blog and Events are ready! 🎉');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();

