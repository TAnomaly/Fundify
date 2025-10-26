use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub struct Database {
    pub pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(30))
            .connect(database_url)
            .await?;

        Ok(Database { pool })
    }

    pub async fn run_migrations(&self) -> anyhow::Result<()> {
        println!("🔄 Running database migrations...");

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
                is_creator BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                media_url TEXT,
                media_type VARCHAR(50),
                is_premium BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

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
            CREATE TABLE IF NOT EXISTS purchases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                stripe_payment_intent_id VARCHAR(255),
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

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

        println!("✅ Database migrations completed successfully!");
        Ok(())
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Database {
            pool: self.pool.clone(),
        }
    }
}

impl Database {
    pub async fn get_events(
        &self,
        limit: i64,
        offset: i64,
        upcoming: bool,
    ) -> Result<Vec<crate::routes::events::Event>, sqlx::Error> {
        let query = if upcoming {
            "SELECT id, title, description, status, \"startTime\" as start_time, \"endTime\" as end_time, location, \"createdAt\" as created_at, \"updatedAt\" as updated_at, \"hostId\" as host_id FROM \"Event\" WHERE \"startTime\" > NOW() ORDER BY \"startTime\" ASC LIMIT $1 OFFSET $2"
        } else {
            "SELECT id, title, description, status, \"startTime\" as start_time, \"endTime\" as end_time, location, \"createdAt\" as created_at, \"updatedAt\" as updated_at, \"hostId\" as host_id FROM \"Event\" ORDER BY \"startTime\" DESC LIMIT $1 OFFSET $2"
        };

        sqlx::query_as::<_, crate::routes::events::Event>(query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
    }
}
