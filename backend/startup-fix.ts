import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureDatabaseTables() {
  try {
    console.log('🔧 Checking database tables...');

    // Check if DigitalProduct table exists
    const digitalProductExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'DigitalProduct'
      );
    `;

    // Check if Purchase table exists
    const purchaseExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Purchase'
      );
    `;

    console.log('DigitalProduct table exists:', digitalProductExists);
    console.log('Purchase table exists:', purchaseExists);

    // If tables don't exist, create them
    if (!digitalProductExists || !purchaseExists) {
      console.log('🚀 Creating Digital Products tables...');

      // Create DigitalProduct table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "DigitalProduct" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "price" REAL NOT NULL,
          "productType" "ProductType" NOT NULL,
          "fileUrl" TEXT,
          "fileSize" BIGINT,
          "coverImage" TEXT,
          "previewUrl" TEXT,
          "features" TEXT[],
          "requirements" TEXT[],
          "salesCount" INTEGER NOT NULL DEFAULT 0,
          "revenue" REAL NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "isFeatured" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "creatorId" TEXT NOT NULL,
          CONSTRAINT "DigitalProduct_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `;

      // Create Purchase table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Purchase" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "amount" REAL NOT NULL,
          "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
          "paymentMethod" TEXT,
          "transactionId" TEXT UNIQUE,
          "downloadCount" INTEGER NOT NULL DEFAULT 0,
          "lastDownloadAt" TIMESTAMP(3),
          "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "userId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DigitalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `;

      // Create indexes
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "DigitalProduct_creatorId_idx" ON "DigitalProduct"("creatorId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "DigitalProduct_productType_idx" ON "DigitalProduct"("productType");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "DigitalProduct_isActive_idx" ON "DigitalProduct"("isActive");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "DigitalProduct_isFeatured_idx" ON "DigitalProduct"("isFeatured");`;
      
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Purchase_userId_idx" ON "Purchase"("userId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Purchase_productId_idx" ON "Purchase"("productId");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Purchase_status_idx" ON "Purchase"("status");`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Purchase_purchasedAt_idx" ON "Purchase"("purchasedAt");`;

      console.log('✅ Digital Products tables created successfully!');
    } else {
      console.log('✅ Digital Products tables already exist');
    }

  } catch (error) {
    console.error('❌ Error ensuring database tables:', error);
    throw error;
  }
}
