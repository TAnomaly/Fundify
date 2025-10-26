use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub redis_public_url: String,
    pub cloud_amqp_url: String,
    pub jwt_secret: String,
    pub jwt_expires_in: String,
    pub github_client_id: String,
    pub github_client_secret: String,
    pub github_callback_url: String,
    pub frontend_url: String,
    pub cors_origin: String,
    pub stripe_publishable_key: String,
    pub stripe_secret_key: String,
    pub stripe_webhook_secret: String,
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub supabase_service_role_key: String,
    pub supabase_bucket: String,
    pub port: u16,
    pub node_env: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok(); // Load .env file if it exists

        Ok(Config {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://localhost/funify".to_string()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            redis_public_url: env::var("REDIS_PUBLIC_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            cloud_amqp_url: env::var("CLOUD_AMQP")
                .unwrap_or_else(|_| "amqp://localhost:5672".to_string()),
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string()),
            jwt_expires_in: env::var("JWT_EXPIRES_IN").unwrap_or_else(|_| "7d".to_string()),
            github_client_id: env::var("GITHUB_CLIENT_ID").unwrap_or_else(|_| "".to_string()),
            github_client_secret: env::var("GITHUB_CLIENT_SECRET")
                .unwrap_or_else(|_| "".to_string()),
            github_callback_url: env::var("GITHUB_CALLBACK_URL").unwrap_or_else(|_| "".to_string()),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            stripe_publishable_key: env::var("STRIPE_PUBLISHABLE_KEY")
                .unwrap_or_else(|_| "".to_string()),
            stripe_secret_key: env::var("STRIPE_SECRET_KEY").unwrap_or_else(|_| "".to_string()),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET")
                .unwrap_or_else(|_| "".to_string()),
            supabase_url: env::var("SUPABASE_URL").unwrap_or_else(|_| "".to_string()),
            supabase_anon_key: env::var("SUPABASE_ANON_KEY").unwrap_or_else(|_| "".to_string()),
            supabase_service_role_key: env::var("SUPABASE_SERVICE_ROLE_KEY")
                .unwrap_or_else(|_| "".to_string()),
            supabase_bucket: env::var("SUPABASE_BUCKET").unwrap_or_else(|_| "media".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "4000".to_string())
                .parse()
                .unwrap_or(4000),
            node_env: env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string()),
        })
    }
}
