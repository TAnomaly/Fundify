DROP INDEX IF EXISTS idx_users_is_creator;
DROP INDEX IF EXISTS idx_users_username;

ALTER TABLE users
    DROP COLUMN IF EXISTS social_links,
    DROP COLUMN IF EXISTS creator_bio,
    DROP COLUMN IF EXISTS is_creator,
    DROP COLUMN IF EXISTS role,
    DROP COLUMN IF EXISTS banner_image;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'avatar'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users RENAME COLUMN avatar TO avatar_url;
    END IF;
END;
$$;
