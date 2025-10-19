use anyhow::{anyhow, Context, Result};
use chrono::Duration;
use std::env;
use std::time::Duration as StdDuration;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub supabase: SupabaseConfig,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let server = ServerConfig::from_env()?;
        let database = DatabaseConfig::from_env()?;
        let jwt = JwtConfig::from_env()?;
        let supabase = SupabaseConfig::from_env();

        Ok(Self {
            server,
            database,
            jwt,
            supabase,
        })
    }
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl ServerConfig {
    fn from_env() -> Result<Self> {
        let host = env::var("SERVER_HOST")
            .or_else(|_| env::var("HOST"))
            .unwrap_or_else(|_| "0.0.0.0".to_string());

        // Try PORT first (Railway standard), then SERVER_PORT, then default to 8080
        let port = env::var("PORT")
            .or_else(|_| env::var("SERVER_PORT"))
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .context("invalid PORT value")?;

        Ok(Self { host, port })
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub acquire_timeout: StdDuration,
}

impl DatabaseConfig {
    fn from_env() -> Result<Self> {
        let url =
            env::var("DATABASE_URL").context("DATABASE_URL is required to start the API server")?;

        let max_connections = env::var("DATABASE_MAX_CONNECTIONS")
            .unwrap_or_else(|_| "10".to_string())
            .parse::<u32>()
            .context("invalid DATABASE_MAX_CONNECTIONS value")?;

        let acquire_timeout = env::var("DATABASE_ACQUIRE_TIMEOUT_SECS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .map(StdDuration::from_secs)
            .unwrap_or_else(|| StdDuration::from_secs(5));

        Ok(Self {
            url,
            max_connections,
            acquire_timeout,
        })
    }
}

#[derive(Debug, Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub issuer: String,
    pub audience: String,
    pub expiration: Duration,
}

impl JwtConfig {
    fn from_env() -> Result<Self> {
        let secret = env::var("JWT_SECRET")
            .map_err(|_| anyhow!("JWT_SECRET is required to sign authentication tokens"))?;
        let issuer = env::var("JWT_ISSUER").unwrap_or_else(|_| "fundify-backend".to_string());
        let audience = env::var("JWT_AUDIENCE").unwrap_or_else(|_| "fundify-clients".to_string());

        let expiration = env::var("JWT_EXPIRATION_SECS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .map(|secs| Duration::seconds(secs as i64))
            .unwrap_or_else(|| Duration::hours(24)); // 24h default

        Ok(Self {
            secret,
            issuer,
            audience,
            expiration,
        })
    }
}

#[derive(Debug, Clone)]
pub struct SupabaseConfig {
    pub url: Option<String>,
    pub service_role_key: Option<String>,
}

impl SupabaseConfig {
    fn from_env() -> Self {
        let url = env::var("SUPABASE_URL")
            .ok()
            .filter(|value| !value.is_empty());
        let service_role_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
            .ok()
            .filter(|value| !value.is_empty());

        Self {
            url,
            service_role_key,
        }
    }

    pub fn is_configured(&self) -> bool {
        self.url.is_some() && self.service_role_key.is_some()
    }
}
