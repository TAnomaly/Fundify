-- Add metadata and readAt columns to Notification table
ALTER TABLE "Notification"
ADD COLUMN "metadata" JSONB,
ADD COLUMN "readAt" TIMESTAMP(3);
