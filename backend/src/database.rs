use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;
use tracing::warn;

use crate::amqp_client::AmqpClient;
use crate::redis_client::RedisClient;

pub struct Database {
    pub pool: PgPool,
    pub redis: Option<RedisClient>,
    pub amqp: Option<AmqpClient>,
}

impl Database {
    pub async fn new(database_url: &str) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(30))
            .connect(database_url)
            .await?;

        Ok(Database { pool, redis: None, amqp: None })
    }

    pub async fn with_redis(database_url: &str, redis_url: &str) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(30))
            .connect(database_url)
            .await?;

        let redis = match RedisClient::new(redis_url).await {
            Ok(client) => {
                tracing::info!("✅ Redis connected successfully");
                Some(client)
            }
            Err(e) => {
                tracing::warn!("⚠️  Failed to connect to Redis: {}. Continuing without cache.", e);
                None
            }
        };

        Ok(Database { pool, redis, amqp: None })
    }

    pub async fn with_all(database_url: &str, redis_url: &str, amqp_url: &str) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(20) // Increased for better concurrency
            .min_connections(5)  // Keep some connections warm
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(300)) // 5 minutes
            .max_lifetime(Duration::from_secs(1800)) // 30 minutes
            .connect(database_url)
            .await?;

        let redis = match RedisClient::new(redis_url).await {
            Ok(client) => {
                tracing::info!("✅ Redis connected successfully");
                Some(client)
            }
            Err(e) => {
                tracing::warn!("⚠️  Failed to connect to Redis: {}. Continuing without cache.", e);
                None
            }
        };

        let amqp = match AmqpClient::new(amqp_url).await {
            Ok(client) => {
                tracing::info!("✅ CloudAMQP connected successfully");
                Some(client)
            }
            Err(e) => {
                tracing::warn!("⚠️  Failed to connect to CloudAMQP: {}. Continuing without job queue.", e);
                None
            }
        };

        Ok(Database { pool, redis, amqp })
    }

    pub async fn run_migrations(&self) -> anyhow::Result<()> {
        println!("🔄 Running database migrations...");

        // Run SQLx migrations from migrations/ directory
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| {
                warn!("SQLx migrations failed: {}", e);
                anyhow::anyhow!("Migration error: {}", e)
            })?;

        println!("✅ Database migrations completed successfully");

        if let Err(error) = sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "pgcrypto""#)
            .execute(&self.pool)
            .await
        {
            warn!("Skipping pgcrypto extension setup: {}", error);
        }

        // Create tables if they don't exist
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                github_id BIGINT UNIQUE,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE,
                display_name VARCHAR(255),
                avatar_url TEXT,
                bio TEXT,
                password_hash TEXT,
                is_creator BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                media_url TEXT,
                media_type VARCHAR(50),
                image_urls TEXT[],
                video_url TEXT,
                audio_url TEXT,
                is_premium BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls TEXT[]")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT")
            .execute(&self.pool)
            .await?;

        // Fix user_id type mismatch (users.id is TEXT, posts.user_id should be TEXT too)
        // Drop and recreate constraint if needed
        sqlx::query("ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey")
            .execute(&self.pool)
            .await?;

        // Change column type if it's UUID
        sqlx::query("ALTER TABLE posts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT")
            .execute(&self.pool)
            .await
            .ok(); // Ignore error if already TEXT

        // Re-add foreign key constraint
        sqlx::query("ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
            .execute(&self.pool)
            .await
            .ok(); // Ignore error if constraint already exists

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS articles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                content TEXT,
                slug VARCHAR(255) UNIQUE NOT NULL,
                author_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                published_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DOUBLE PRECISION NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                image_url TEXT,
                is_digital BOOLEAN DEFAULT FALSE,
                download_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS article_likes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(article_id, user_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS article_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                stripe_subscription_id VARCHAR(255),
                status VARCHAR(50) NOT NULL,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create campaigns table with all necessary columns
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                goal_amount DOUBLE PRECISION NOT NULL,
                current_amount DOUBLE PRECISION DEFAULT 0.0,
                status VARCHAR(50) DEFAULT 'DRAFT',
                slug VARCHAR(255) UNIQUE NOT NULL,
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Add missing columns if they don't exist
        sqlx::query("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS story TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cover_image TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_url TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'OTHER'",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS podcasts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) DEFAULT 'Technology',
                language VARCHAR(100) DEFAULT 'English',
                status VARCHAR(50) DEFAULT 'PUBLISHED',
                cover_image TEXT,
                spotify_show_url TEXT,
                external_feed_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS podcast_episodes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                episode_number INTEGER,
                duration INTEGER,
                audio_url TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'PUBLISHED',
                spotify_episode_url TEXT,
                published_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_podcast_creator ON podcasts(creator_id)")
            .execute(&self.pool)
            .await?;

        // Fix podcasts.creator_id type to match users.id
        sqlx::query("ALTER TABLE podcasts DROP CONSTRAINT IF EXISTS podcasts_creator_id_fkey")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE podcasts ALTER COLUMN creator_id TYPE TEXT")
            .execute(&self.pool)
            .await
            .ok(); // Ignore error if already TEXT

        sqlx::query("ALTER TABLE podcasts ADD CONSTRAINT podcasts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE")
            .execute(&self.pool)
            .await
            .ok(); // Ignore error if constraint already exists

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_podcast_episode_podcast ON podcast_episodes(podcast_id)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                host_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'DRAFT',
                event_type VARCHAR(50) DEFAULT 'VIRTUAL',
                cover_image TEXT,
                start_time TIMESTAMP WITH TIME ZONE NOT NULL,
                end_time TIMESTAMP WITH TIME ZONE,
                timezone VARCHAR(100),
                location TEXT,
                virtual_link TEXT,
                max_attendees INTEGER,
                is_public BOOLEAN DEFAULT TRUE,
                is_premium BOOLEAN DEFAULT FALSE,
                price DOUBLE PRECISION DEFAULT 0.0,
                agenda TEXT,
                tags TEXT[],
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'VIRTUAL'",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS virtual_link TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INTEGER")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS agenda TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS tags TEXT[]")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION DEFAULT 0.0",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT'",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
            .execute(&self.pool)
            .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
            .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS event_rsvps (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                status VARCHAR(20) NOT NULL,
                is_paid BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(event_id, user_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_event_id_fkey")
            .execute(&self.pool)
            .await
            .ok();

        sqlx::query("ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_user_id_fkey")
            .execute(&self.pool)
            .await
            .ok();

        sqlx::query("ALTER TABLE event_rsvps ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT")
            .execute(&self.pool)
            .await
            .ok();

        sqlx::query("ALTER TABLE event_rsvps ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT")
            .execute(&self.pool)
            .await
            .ok();

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS purchases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                stripe_payment_intent_id VARCHAR(255),
                stripe_checkout_session_id VARCHAR(255),
                amount DOUBLE PRECISION NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "ALTER TABLE purchases ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "ALTER TABLE purchases ALTER COLUMN amount TYPE DOUBLE PRECISION USING amount::DOUBLE PRECISION",
        )
        .execute(&self.pool)
        .await
        .ok();

        sqlx::query(
            "ALTER TABLE purchases ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC'",
        )
        .execute(&self.pool)
        .await
        .ok();

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_id ON subscriptions(creator_id)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_campaigns_creator_id ON campaigns(creator_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS follows (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                follower_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                following_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(follower_id, following_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS referral_codes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                code VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                reward_type VARCHAR(50) DEFAULT 'SUBSCRIPTION_CREDIT',
                usage_limit INTEGER,
                usage_count INTEGER DEFAULT 0,
                expires_at TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_referrals_creator ON referral_codes(creator_id)",
        )
        .execute(&self.pool)
        .await?;

        // Performance indexes for common queries
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time DESC)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON event_rsvps(status) WHERE UPPER(TRIM(status)) = 'GOING'",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status ON event_rsvps(event_id, status)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type) WHERE media_type IS NOT NULL",
        )
        .execute(&self.pool)
        .await?;

        // Post likes table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS post_likes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(post_id, user_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)")
            .execute(&self.pool)
            .await?;

        // Post comments table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id)")
            .execute(&self.pool)
            .await?;

        println!("✅ Database migrations completed successfully!");
        Ok(())
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Database {
            pool: self.pool.clone(),
            redis: self.redis.clone(),
            amqp: self.amqp.clone(),
        }
    }
}

impl Database {}
