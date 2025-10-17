/**
 * Startup Fix - Runs before server starts
 * Auto-creates database tables if they don't exist
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureDatabaseTables() {
  console.log('🔧 Checking database tables...');
  
  try {
    // Try to query PostLike table
    await prisma.postLike.count();
    console.log('✅ PostLike table exists');
  } catch (error) {
    // Table doesn't exist, create it
    console.log('📝 Creating PostLike table...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PostLike" (
          "id" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "userId" TEXT NOT NULL,
          "postId" TEXT NOT NULL,
          CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
        );
        
        CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");
        CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");
        CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_userId_postId_key" ON "PostLike"("userId", "postId");
        
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
        END $$;
      `);
      console.log('✅ PostLike table created');
    } catch (createError: any) {
      console.error('❌ Failed to create PostLike:', createError.message);
    }
  }
  
  try {
    // Try to query PostComment table
    await prisma.postComment.count();
    console.log('✅ PostComment table exists');
  } catch (error) {
    // Table doesn't exist, create it
    console.log('📝 Creating PostComment table...');
    try {
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
        
        CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");
        CREATE INDEX IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId");
        CREATE INDEX IF NOT EXISTS "PostComment_createdAt_idx" ON "PostComment"("createdAt");
        
        DO $$ 
        BEGIN
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
      console.log('✅ PostComment table created');
    } catch (createError: any) {
      console.error('❌ Failed to create PostComment:', createError.message);
    }
  }

  // Follow table creation intentionally handled via Prisma migrations
  try {
    await prisma.follow.count();
    console.log('✅ Follow table exists');
  } catch {
    console.log('📝 Creating Follow table...');

    const queries = [
      `
      CREATE TABLE IF NOT EXISTS "Follow" (
        "id" TEXT NOT NULL,
        "followerId" TEXT NOT NULL,
        "followingId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
      )
      `,
      `
      CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key"
      ON "Follow"("followerId", "followingId")
      `,
      `
      CREATE INDEX IF NOT EXISTS "Follow_followerId_idx"
      ON "Follow"("followerId")
      `,
      `
      CREATE INDEX IF NOT EXISTS "Follow_followingId_idx"
      ON "Follow"("followingId")
      `,
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'Follow_followerId_fkey'
        ) THEN
          ALTER TABLE "Follow"
          ADD CONSTRAINT "Follow_followerId_fkey"
          FOREIGN KEY ("followerId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
      `,
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'Follow_followingId_fkey'
        ) THEN
          ALTER TABLE "Follow"
          ADD CONSTRAINT "Follow_followingId_fkey"
          FOREIGN KEY ("followingId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
      `,
    ];

    try {
      // Execute statements sequentially to avoid multi-command issues
      for (const query of queries) {
        await prisma.$executeRawUnsafe(query);
      }
      console.log('✅ Follow table created');
    } catch (error) {
      console.error('❌ Failed to create Follow table via startup fix:', (error as Error).message);
      console.warn('⚠️ Please run `npx prisma migrate deploy` to sync the database schema.');
    }
  }

  console.log('✅ Database ready!');
}
