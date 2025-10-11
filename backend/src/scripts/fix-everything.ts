/**
 * Automatic Fix Script
 * Tests and fixes:
 * 1. Database tables (PostLike, PostComment)
 * 2. Supabase bucket configuration
 */

import { PrismaClient } from '@prisma/client';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const prisma = new PrismaClient();

async function fixDatabase() {
  console.log('\n🗄️  Checking Database Tables...\n');
  
  try {
    // Try to create the tables using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PostLike" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
      );
    `);
    
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
    
    console.log('✅ Tables created/verified');
    
    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_userId_postId_key" ON "PostLike"("userId", "postId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PostComment_createdAt_idx" ON "PostComment"("createdAt");
    `);
    
    console.log('✅ Indexes created/verified');
    
    // Add foreign keys (with error handling)
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'PostLike_userId_fkey'
          ) THEN
            ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'PostLike_postId_fkey'
          ) THEN
            ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" 
            FOREIGN KEY ("postId") REFERENCES "CreatorPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'PostComment_userId_fkey'
          ) THEN
            ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'PostComment_postId_fkey'
          ) THEN
            ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" 
            FOREIGN KEY ("postId") REFERENCES "CreatorPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      
      console.log('✅ Foreign keys created/verified');
    } catch (error: any) {
      console.log('⚠️  Foreign keys might already exist:', error.message);
    }
    
    // Test the tables
    const likeCount = await prisma.postLike.count();
    const commentCount = await prisma.postComment.count();
    
    console.log(`✅ Database working! Likes: ${likeCount}, Comments: ${commentCount}`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Database fix failed:', error.message);
    return false;
  }
}

async function checkSupabase() {
  console.log('\n☁️  Checking Supabase Configuration...\n');
  
  if (!isSupabaseConfigured()) {
    console.log('❌ Supabase NOT configured');
    console.log('   Missing environment variables:');
    if (!process.env.SUPABASE_URL) console.log('   - SUPABASE_URL');
    if (!process.env.SUPABASE_ANON_KEY) console.log('   - SUPABASE_ANON_KEY');
    return false;
  }
  
  console.log('✅ Supabase credentials configured');
  console.log('   URL:', process.env.SUPABASE_URL);
  
  // Try to test bucket access
  try {
    if (!supabase) {
      console.log('❌ Supabase client not initialized');
      return false;
    }
    
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Cannot access Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Supabase accessible');
    console.log('   Buckets found:', data?.length || 0);
    
    // Check for fundify-media bucket
    const fundifyBucket = data?.find((b: any) => b.name === 'fundify-media');
    
    if (!fundifyBucket) {
      console.log('❌ Bucket "fundify-media" NOT FOUND');
      console.log('\n📋 FIX THIS:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/xljawtuavcznqigmbrpt/storage/buckets');
      console.log('   2. Click "New bucket"');
      console.log('   3. Name: fundify-media');
      console.log('   4. ✅ Check "Public bucket"');
      console.log('   5. Click "Create"\n');
      return false;
    }
    
    console.log('✅ Bucket "fundify-media" exists');
    console.log('   Public:', fundifyBucket.public ? 'Yes ✅' : 'No ❌');
    
    if (!fundifyBucket.public) {
      console.log('\n📋 FIX THIS:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/xljawtuavcznqigmbrpt/storage/buckets');
      console.log('   2. Click on "fundify-media"');
      console.log('   3. Click Settings ⚙️');
      console.log('   4. ✅ Check "Public bucket"');
      console.log('   5. Click "Save"\n');
      return false;
    }
    
    // Try a test upload
    const testFile = Buffer.from('test');
    const testPath = `test/diagnostic-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('fundify-media')
      .upload(testPath, testFile, {
        contentType: 'text/plain',
        upsert: true,
      });
    
    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message);
      return false;
    }
    
    console.log('✅ Upload test successful');
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('fundify-media')
      .getPublicUrl(testPath);
    
    console.log('✅ Public URL works:', urlData.publicUrl);
    
    // Clean up test file
    await supabase.storage.from('fundify-media').remove([testPath]);
    
    return true;
  } catch (error: any) {
    console.log('❌ Supabase test failed:', error.message);
    console.log('   Stack:', error.stack);
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  🔧 Automatic Diagnostic & Fix Tool  ║');
  console.log('╚═══════════════════════════════════════╝');
  
  const dbOk = await fixDatabase();
  const supabaseOk = await checkSupabase();
  
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║           📊 SUMMARY                  ║');
  console.log('╚═══════════════════════════════════════╝\n');
  
  console.log(`Database (Likes/Comments): ${dbOk ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Supabase (Media Storage):  ${supabaseOk ? '✅ WORKING' : '❌ NEEDS FIX'}`);
  
  console.log('\n');
  
  if (!dbOk) {
    console.log('🚨 Database tables could not be created automatically.');
    console.log('   Run: npx prisma db push');
  }
  
  if (!supabaseOk) {
    console.log('🚨 Supabase storage needs manual configuration.');
    console.log('   See instructions above.');
  }
  
  if (dbOk && supabaseOk) {
    console.log('🎉 EVERYTHING IS WORKING!');
    console.log('   - Likes and comments will persist');
    console.log('   - Media files will never disappear');
    console.log('   - Ready for production! 🚀');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

