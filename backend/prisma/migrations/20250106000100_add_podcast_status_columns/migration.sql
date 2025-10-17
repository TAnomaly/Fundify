-- Align Podcast and PodcastEpisode tables with current Prisma schema

-- Create PodcastStatus enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PodcastStatus'
  ) THEN
    CREATE TYPE "PodcastStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

-- Create EpisodeStatus enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EpisodeStatus'
  ) THEN
    CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

-- Add status column to Podcast and backfill values
ALTER TABLE "Podcast"
  ADD COLUMN IF NOT EXISTS "status" "PodcastStatus";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Podcast'
      AND column_name = 'isPublic'
  ) THEN
    EXECUTE
      'UPDATE "Podcast"
         SET "status" = CASE
           WHEN COALESCE("isPublic", true) THEN ''PUBLISHED''
           ELSE ''DRAFT''
         END
       WHERE "status" IS NULL';
  ELSE
    EXECUTE
      'UPDATE "Podcast"
         SET "status" = ''PUBLISHED''
       WHERE "status" IS NULL';
  END IF;
END $$;

ALTER TABLE "Podcast"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "Podcast"
  ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Podcast_status_idx" ON "Podcast" ("status");

-- Add status column to PodcastEpisode and backfill from legacy fields
ALTER TABLE "PodcastEpisode"
  ADD COLUMN IF NOT EXISTS "status" "EpisodeStatus";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'PodcastEpisode'
      AND column_name = 'published'
  ) THEN
    EXECUTE
      'UPDATE "PodcastEpisode"
         SET "status" = CASE
           WHEN COALESCE("published", true) THEN ''PUBLISHED''
           ELSE ''DRAFT''
         END
       WHERE "status" IS NULL';
  ELSE
    EXECUTE
      'UPDATE "PodcastEpisode"
         SET "status" = ''PUBLISHED''
       WHERE "status" IS NULL';
  END IF;
END $$;

ALTER TABLE "PodcastEpisode"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "PodcastEpisode"
  ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PodcastEpisode_status_idx" ON "PodcastEpisode" ("status");

-- Ensure optional fields allow NULL values to match Prisma model
ALTER TABLE "PodcastEpisode"
  ALTER COLUMN "audioUrl" DROP NOT NULL;

ALTER TABLE "PodcastEpisode"
  ALTER COLUMN "duration" DROP NOT NULL;

ALTER TABLE "PodcastEpisode"
  ALTER COLUMN "publishedAt" DROP NOT NULL;

-- Preserve publishedAt default behaviour
ALTER TABLE "PodcastEpisode"
  ALTER COLUMN "publishedAt" SET DEFAULT NULL;
