const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPollTables() {
  console.log('🔧 Creating Poll and PollVote tables...');

  try {
    // Check if tables exist by trying to query them
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Poll" LIMIT 1`;
      console.log('✅ Poll table already exists');
    } catch (error) {
      console.log('📝 Creating Poll table...');

      // Create Poll table
      await prisma.$executeRaw`
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
        )
      `;
      console.log('✅ Poll table created');
    }

    // Check if PollVote exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "PollVote" LIMIT 1`;
      console.log('✅ PollVote table already exists');
    } catch (error) {
      console.log('📝 Creating PollVote table...');

      // Create PollVote table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "PollVote" (
          "id" TEXT NOT NULL,
          "optionIndex" INTEGER NOT NULL,
          "optionText" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "userId" TEXT NOT NULL,
          "pollId" TEXT NOT NULL,
          CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
        )
      `;
      console.log('✅ PollVote table created');
    }

    // Create indexes
    console.log('📝 Creating indexes...');

    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Poll_creatorId_idx" ON "Poll"("creatorId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Poll_createdAt_idx" ON "Poll"("createdAt")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Poll_isActive_idx" ON "Poll"("isActive")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PollVote_userId_idx" ON "PollVote"("userId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PollVote_pollId_idx" ON "PollVote"("pollId")`;

    console.log('✅ Indexes created');

    // Create unique constraint
    console.log('📝 Creating unique constraint...');
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_userId_pollId_optionIndex_key"
      ON "PollVote"("userId", "pollId", "optionIndex")
    `;
    console.log('✅ Unique constraint created');

    // Add foreign keys
    console.log('📝 Adding foreign keys...');

    try {
      await prisma.$executeRaw`
        ALTER TABLE "Poll" ADD CONSTRAINT "Poll_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log('⚠️ Poll foreign key error:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log('⚠️ PollVote userId foreign key error:', error.message);
      }
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey"
        FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
      `;
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log('⚠️ PollVote pollId foreign key error:', error.message);
      }
    }

    console.log('✅ Foreign keys added');
    console.log('🎉 Poll tables setup complete!');

  } catch (error) {
    console.error('❌ Error creating poll tables:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPollTables()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
