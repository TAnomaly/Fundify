DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users RENAME COLUMN avatar_url TO avatar;
    END IF;
END;
$$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS banner_image TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER',
    ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS creator_bio TEXT,
    ADD COLUMN IF NOT EXISTS social_links JSONB;

CREATE INDEX IF NOT EXISTS idx_users_is_creator ON users (is_creator);
CREATE INDEX IF NOT EXISTS idx_users_username ON users ((lower(username)));
