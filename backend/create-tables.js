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
        "ticketCode" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "isPaid" BOOLEAN NOT NULL DEFAULT false,
        "paymentId" TEXT,
        "checkedIn" BOOLEAN NOT NULL DEFAULT false,
        "checkedInAt" TIMESTAMP(3),
        "checkedInBy" TEXT,
        "userId" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "EventRSVP_ticketCode_key" UNIQUE ("ticketCode")
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
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EventRSVP_ticketCode_idx" ON "EventRSVP"("ticketCode");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EventRSVP_checkedIn_idx" ON "EventRSVP"("checkedIn");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EventReminder_eventId_idx" ON "EventReminder"("eventId");`);

    console.log('✅ Event tables created!');

    // Create Article tables (Blog)
    console.log('\n📝 Creating Article tables...');

    // Drop existing Article tables to recreate with correct schema
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ArticleLike" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ArticleComment" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ArticleTag" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "ArticleCategory" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Article" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Tag" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Category" CASCADE;`);

    // Create Category table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT,
        "icon" TEXT,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Category_name_key" UNIQUE ("name"),
        CONSTRAINT "Category_slug_key" UNIQUE ("slug")
      );
    `);

    // Create Tag table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Tag" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Tag_name_key" UNIQUE ("name"),
        CONSTRAINT "Tag_slug_key" UNIQUE ("slug")
      );
    `);

    // Create Article table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Article" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "excerpt" TEXT,
        "content" TEXT NOT NULL,
        "coverImage" TEXT,
        "metaTitle" TEXT,
        "metaDescription" TEXT,
        "keywords" TEXT[],
        "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
        "publishedAt" TIMESTAMP(3),
        "scheduledFor" TIMESTAMP(3),
        "viewCount" INTEGER NOT NULL DEFAULT 0,
        "readTime" INTEGER,
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "isPremium" BOOLEAN NOT NULL DEFAULT false,
        "minimumTierId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "authorId" TEXT NOT NULL,
        CONSTRAINT "Article_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Article_slug_key" UNIQUE ("slug")
      );
    `);

    // Create ArticleCategory join table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ArticleCategory" (
        "articleId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("articleId", "categoryId")
      );
    `);

    // Create ArticleTag join table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ArticleTag" (
        "articleId" TEXT NOT NULL,
        "tagId" TEXT NOT NULL,
        CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId", "tagId")
      );
    `);

    // Create ArticleComment table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ArticleComment" (
        "id" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "articleId" TEXT NOT NULL,
        "parentId" TEXT,
        CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create ArticleLike table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ArticleLike" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "articleId" TEXT NOT NULL,
        CONSTRAINT "ArticleLike_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create indexes for Article tables
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Category_slug_idx" ON "Category"("slug");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Tag_slug_idx" ON "Tag"("slug");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Article_slug_idx" ON "Article"("slug");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Article_authorId_idx" ON "Article"("authorId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Article_publishedAt_idx" ON "Article"("publishedAt");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Article_isPremium_idx" ON "Article"("isPremium");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleCategory_articleId_idx" ON "ArticleCategory"("articleId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleCategory_categoryId_idx" ON "ArticleCategory"("categoryId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleTag_articleId_idx" ON "ArticleTag"("articleId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleComment_userId_idx" ON "ArticleComment"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleComment_articleId_idx" ON "ArticleComment"("articleId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleComment_parentId_idx" ON "ArticleComment"("parentId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleComment_createdAt_idx" ON "ArticleComment"("createdAt");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ArticleLike_userId_articleId_key" ON "ArticleLike"("userId", "articleId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleLike_userId_idx" ON "ArticleLike"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ArticleLike_articleId_idx" ON "ArticleLike"("articleId");`);

    // Add foreign keys for Article tables
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey"
      FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "ArticleComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    console.log('✅ Article tables created!');

    // Create Notification tables
    console.log('\n🔔 Creating Notification tables...');

    // Create NotificationType enum if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "NotificationType" AS ENUM (
          'NEW_SUBSCRIBER',
          'NEW_COMMENT',
          'NEW_LIKE',
          'NEW_DONATION',
          'EVENT_RSVP',
          'NEW_POST',
          'EVENT_REMINDER',
          'SUBSCRIPTION_EXPIRING',
          'PAYOUT_COMPLETED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Drop existing Notification table to recreate
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Notification" CASCADE;`);

    // Create Notification table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Notification" (
        "id" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "link" TEXT,
        "imageUrl" TEXT,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "actorId" TEXT,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create indexes for Notification
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");`);

    // Add foreign keys for Notification
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    console.log('✅ Notification tables created!');

    // Create Poll table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Poll" (
        "id" TEXT NOT NULL,
        "question" TEXT NOT NULL,
        "options" TEXT[],
        "expiresAt" TIMESTAMP(3),
        "multipleChoice" BOOLEAN NOT NULL DEFAULT false,
        "allowAddOption" BOOLEAN NOT NULL DEFAULT false,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "minimumTierId" TEXT,
        "totalVotes" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Poll table created');

    // Create PollVote table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PollVote" (
        "id" TEXT NOT NULL,
        "optionIndex" INTEGER NOT NULL,
        "optionText" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "pollId" TEXT NOT NULL,
        CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ PollVote table created');

    // Create Poll indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Poll_creatorId_idx" ON "Poll"("creatorId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Poll_createdAt_idx" ON "Poll"("createdAt");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Poll_isActive_idx" ON "Poll"("isActive");
    `);
    console.log('✅ Poll indexes created');

    // Create PollVote indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PollVote_userId_idx" ON "PollVote"("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PollVote_pollId_idx" ON "PollVote"("pollId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_userId_pollId_optionIndex_key"
      ON "PollVote"("userId", "pollId", "optionIndex");
    `);
    console.log('✅ PollVote indexes created');

    // Add Poll foreign keys
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Poll" ADD CONSTRAINT "Poll_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey"
        FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Poll foreign keys created');

    // Create Goal, Download, and Message tables
    console.log('\n🎯 Creating Goal, Download, and Message tables...');

    // Create enums for new features
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "GoalType" AS ENUM ('REVENUE', 'SUBSCRIBERS', 'CUSTOM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "FileType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'ARCHIVE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Goal, Download, Message enums created');

    // Create Goal table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Goal" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "type" "GoalType" NOT NULL DEFAULT 'REVENUE',
        "targetAmount" DECIMAL(10,2) NOT NULL,
        "currentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "rewardDescription" TEXT,
        "deadline" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Goal table created');

    // Create Download table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Download" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "fileUrl" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "fileSize" BIGINT NOT NULL,
        "fileType" "FileType" NOT NULL,
        "mimeType" TEXT NOT NULL,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "minimumTierId" TEXT,
        "downloadCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Download table created');

    // Create DownloadRecord table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DownloadRecord" (
        "id" TEXT NOT NULL,
        "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "downloadId" TEXT NOT NULL,
        CONSTRAINT "DownloadRecord_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ DownloadRecord table created');

    // Create Conversation table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Conversation" (
        "id" TEXT NOT NULL,
        "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "user1Id" TEXT NOT NULL,
        "user2Id" TEXT NOT NULL,
        CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Conversation table created');

    // Create Message table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "type" "MessageType" NOT NULL DEFAULT 'TEXT',
        "fileUrl" TEXT,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "senderId" TEXT NOT NULL,
        "receiverId" TEXT,
        "conversationId" TEXT,
        CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Message table created');

    // Create indexes for Goal
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Goal_creatorId_idx" ON "Goal"("creatorId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Goal_type_idx" ON "Goal"("type");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Goal_isActive_idx" ON "Goal"("isActive");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Goal_isCompleted_idx" ON "Goal"("isCompleted");
    `);

    // Create indexes for Download
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Download_creatorId_idx" ON "Download"("creatorId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Download_fileType_idx" ON "Download"("fileType");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Download_isPublic_idx" ON "Download"("isPublic");
    `);

    // Create indexes for DownloadRecord
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DownloadRecord_userId_idx" ON "DownloadRecord"("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DownloadRecord_downloadId_idx" ON "DownloadRecord"("downloadId");
    `);

    // Create indexes for Conversation
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Conversation_user1Id_idx" ON "Conversation"("user1Id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Conversation_user2Id_idx" ON "Conversation"("user2Id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_user1Id_user2Id_key" ON "Conversation"("user1Id", "user2Id");
    `);

    // Create indexes for Message
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Message_receiverId_idx" ON "Message"("receiverId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");
    `);

    console.log('✅ Goal, Download, Message indexes created');

    // Add foreign keys
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Goal" ADD CONSTRAINT "Goal_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Download" ADD CONSTRAINT "Download_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "DownloadRecord" ADD CONSTRAINT "DownloadRecord_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "DownloadRecord" ADD CONSTRAINT "DownloadRecord_downloadId_fkey"
        FOREIGN KEY ("downloadId") REFERENCES "Download"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user1Id_fkey"
        FOREIGN KEY ("user1Id") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user2Id_fkey"
        FOREIGN KEY ("user2Id") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
        FOREIGN KEY ("senderId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey"
        FOREIGN KEY ("receiverId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
        FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Goal, Download, Message foreign keys created');

    // Create Scheduled Posts, Welcome Messages, and Analytics tables
    console.log('\n📅 Creating Scheduled Posts, Welcome Messages, and Analytics tables...');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ScheduledPost" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "excerpt" TEXT,
        "coverImage" TEXT,
        "mediaUrls" TEXT[],
        "scheduledFor" TIMESTAMP(3) NOT NULL,
        "published" BOOLEAN NOT NULL DEFAULT false,
        "publishedAt" TIMESTAMP(3),
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "minimumTierId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WelcomeMessage" (
        "id" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "tierId" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "delay" INTEGER NOT NULL DEFAULT 0,
        "sentCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "WelcomeMessage_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyticsCache" (
        "id" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "newSubscribers" INTEGER NOT NULL DEFAULT 0,
        "canceledSubscribers" INTEGER NOT NULL DEFAULT 0,
        "activeSubscribers" INTEGER NOT NULL DEFAULT 0,
        "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
        "postsPublished" INTEGER NOT NULL DEFAULT 0,
        "pollsCreated" INTEGER NOT NULL DEFAULT 0,
        "eventsCreated" INTEGER NOT NULL DEFAULT 0,
        "totalViews" INTEGER NOT NULL DEFAULT 0,
        "totalLikes" INTEGER NOT NULL DEFAULT 0,
        "totalComments" INTEGER NOT NULL DEFAULT 0,
        "totalDownloads" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('✅ Scheduled Posts, Welcome Messages, Analytics tables created');

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ScheduledPost_creatorId_idx" ON "ScheduledPost"("creatorId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ScheduledPost_scheduledFor_idx" ON "ScheduledPost"("scheduledFor");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ScheduledPost_published_idx" ON "ScheduledPost"("published");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WelcomeMessage_creatorId_idx" ON "WelcomeMessage"("creatorId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WelcomeMessage_tierId_idx" ON "WelcomeMessage"("tierId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WelcomeMessage_isActive_idx" ON "WelcomeMessage"("isActive");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsCache_creatorId_date_key" ON "AnalyticsCache"("creatorId", "date");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AnalyticsCache_creatorId_month_idx" ON "AnalyticsCache"("creatorId", "month");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AnalyticsCache_date_idx" ON "AnalyticsCache"("date");`);

    console.log('✅ Scheduled Posts, Welcome Messages, Analytics indexes created');

    // Add foreign keys
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "WelcomeMessage" ADD CONSTRAINT "WelcomeMessage_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "AnalyticsCache" ADD CONSTRAINT "AnalyticsCache_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Scheduled Posts, Welcome Messages, Analytics foreign keys created');

    // Create Podcast tables
    console.log('\n🎙️ Creating Podcast tables...');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Podcast" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "coverImage" TEXT,
        "author" TEXT NOT NULL,
        "email" TEXT,
        "category" TEXT NOT NULL DEFAULT 'Technology',
        "language" TEXT NOT NULL DEFAULT 'en',
        "isExplicit" BOOLEAN NOT NULL DEFAULT false,
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "minimumTierId" TEXT,
        "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
        "totalListens" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "Podcast_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Podcast table created');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PodcastEpisode" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "audioUrl" TEXT NOT NULL,
        "duration" INTEGER NOT NULL,
        "fileSize" BIGINT NOT NULL,
        "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
        "episodeNumber" INTEGER,
        "season" INTEGER,
        "coverImage" TEXT,
        "showNotes" TEXT,
        "timestamps" JSONB,
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "minimumTierId" TEXT,
        "listenCount" INTEGER NOT NULL DEFAULT 0,
        "likeCount" INTEGER NOT NULL DEFAULT 0,
        "published" BOOLEAN NOT NULL DEFAULT true,
        "publishedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "podcastId" TEXT NOT NULL,
        "creatorId" TEXT NOT NULL,
        CONSTRAINT "PodcastEpisode_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ PodcastEpisode table created');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EpisodeListen" (
        "id" TEXT NOT NULL,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "episodeId" TEXT NOT NULL,
        CONSTRAINT "EpisodeListen_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ EpisodeListen table created');

    // Create indexes for Podcast
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Podcast_creatorId_idx" ON "Podcast"("creatorId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Podcast_isPublic_idx" ON "Podcast"("isPublic");`);

    // Create indexes for PodcastEpisode
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PodcastEpisode_podcastId_idx" ON "PodcastEpisode"("podcastId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PodcastEpisode_creatorId_idx" ON "PodcastEpisode"("creatorId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PodcastEpisode_published_idx" ON "PodcastEpisode"("published");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PodcastEpisode_publishedAt_idx" ON "PodcastEpisode"("publishedAt");`);

    // Create indexes for EpisodeListen
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EpisodeListen_userId_episodeId_key" ON "EpisodeListen"("userId", "episodeId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EpisodeListen_userId_idx" ON "EpisodeListen"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EpisodeListen_episodeId_idx" ON "EpisodeListen"("episodeId");`);

    console.log('✅ Podcast indexes created');

    // Add foreign keys for Podcast tables
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Podcast" ADD CONSTRAINT "Podcast_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_podcastId_fkey"
        FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "EpisodeListen" ADD CONSTRAINT "EpisodeListen_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "EpisodeListen" ADD CONSTRAINT "EpisodeListen_episodeId_fkey"
        FOREIGN KEY ("episodeId") REFERENCES "PodcastEpisode"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('✅ Podcast foreign keys created');

    console.log('✅ All database setup complete! All features ready! 🎉');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();

