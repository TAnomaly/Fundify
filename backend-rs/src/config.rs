use std::env;

use anyhow::Result;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub database_url: String,
    pub frontend_url: String,
    #[serde(default)]
    pub jwt_secret: String,
    #[serde(default)]
    pub stripe_secret_key: String,
    #[serde(default)]
    pub stripe_publishable_key: String,
    #[serde(default)]
    pub stripe_webhook_secret: String,
    #[serde(default)]
    pub redis_url: Option<String>,
    #[serde(default)]
    pub rabbitmq_url: Option<String>,
    #[serde(default)]
    pub supabase_url: Option<String>,
    #[serde(default)]
    pub supabase_anon_key: Option<String>,
    #[serde(default)]
    pub cloudinary_cloud_name: Option<String>,
    #[serde(default)]
    pub cloudinary_api_key: Option<String>,
    #[serde(default)]
    pub cloudinary_api_secret: Option<String>,
    #[serde(default)]
    pub github_client_id: Option<String>,
    #[serde(default)]
    pub github_client_secret: Option<String>,
    #[serde(default)]
    pub github_redirect_base: Option<String>,
    #[serde(default)]
    pub github_redirect_path: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        let database_url = env::var("DATABASE_URL")?;
        let frontend_url = env::var("FRONTEND_URL")
            .or_else(|_| env::var("NEXT_PUBLIC_SITE_URL"))
            .or_else(|_| env::var("NEXT_PUBLIC_FRONTEND_URL"))
            .unwrap_or_else(|_| "http://localhost:3000".to_string());

        Ok(Self {
            database_url,
            frontend_url,
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "change-me".to_string()),
            stripe_secret_key: env::var("STRIPE_SECRET_KEY").unwrap_or_default(),
            stripe_publishable_key: env::var("STRIPE_PUBLISHABLE_KEY").unwrap_or_default(),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default(),
            redis_url: env::var("REDIS_URL")
                .or_else(|_| env::var("REDIS_PUBLIC_URL"))
                .ok(),
            rabbitmq_url: env::var("CLOUD_AMQP")
                .or_else(|_| env::var("RABBITMQ_URL"))
                .ok(),
            supabase_url: env::var("SUPABASE_URL").ok(),
            supabase_anon_key: env::var("SUPABASE_ANON_KEY").ok(),
            cloudinary_cloud_name: env::var("CLOUDINARY_CLOUD_NAME").ok(),
            cloudinary_api_key: env::var("CLOUDINARY_API_KEY").ok(),
            cloudinary_api_secret: env::var("CLOUDINARY_API_SECRET").ok(),
            github_client_id: env::var("GITHUB_CLIENT_ID").ok(),
            github_client_secret: env::var("GITHUB_CLIENT_SECRET").ok(),
            github_redirect_base: env::var("GITHUB_REDIRECT_BASE").ok(),
            github_redirect_path: env::var("GITHUB_REDIRECT_PATH").ok(),
        })
    }

    pub fn frontend_base(&self) -> String {
        self.frontend_url.trim_end_matches('/').to_string()
    }

    pub fn github_redirect_uri(&self) -> Option<String> {
        let base = self
            .github_redirect_base
            .as_deref()
            .unwrap_or("http://localhost:5000");
        let path = self
            .github_redirect_path
            .as_deref()
            .unwrap_or("/api/auth/github/callback");

        let mut uri = base.trim_end_matches('/').to_string();
        if path.starts_with('/') {
            uri.push_str(path);
        } else {
            uri.push('/');
            uri.push_str(path);
        }
        Some(uri)
    }
}
