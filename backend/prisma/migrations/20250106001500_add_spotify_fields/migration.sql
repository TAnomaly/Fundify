ALTER TABLE "Podcast"
  ADD COLUMN IF NOT EXISTS "spotifyShowUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "spotifyShowId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalFeedUrl" TEXT;

CREATE INDEX IF NOT EXISTS "Podcast_spotifyShowId_idx"
  ON "Podcast" ("spotifyShowId");

ALTER TABLE "PodcastEpisode"
  ADD COLUMN IF NOT EXISTS "spotifyEpisodeUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "spotifyEpisodeId" TEXT;

CREATE INDEX IF NOT EXISTS "PodcastEpisode_spotifyEpisodeId_idx"
  ON "PodcastEpisode" ("spotifyEpisodeId");
