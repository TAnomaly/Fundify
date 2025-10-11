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

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();

