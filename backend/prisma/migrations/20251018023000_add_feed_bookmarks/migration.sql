-- CreateEnum
CREATE TYPE "FeedContentType" AS ENUM ('POST', 'ARTICLE', 'EVENT');

-- CreateTable
CREATE TABLE "FeedBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" "FeedContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedBookmark_userId_contentType_contentId_key" ON "FeedBookmark"("userId", "contentType", "contentId");

-- CreateIndex
CREATE INDEX "FeedBookmark_contentType_contentId_idx" ON "FeedBookmark"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "FeedBookmark_userId_createdAt_idx" ON "FeedBookmark"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "FeedBookmark" ADD CONSTRAINT "FeedBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
