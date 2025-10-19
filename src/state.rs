use crate::config::AppConfig;
use anyhow::Result;
use chrono::Duration;
use jsonwebtoken::{DecodingKey, EncodingKey};
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct JwtContext {
    pub encoding: EncodingKey,
    pub decoding: DecodingKey,
    pub issuer: String,
    pub audience: String,
    pub expiration: Duration,
}

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub db_pool: PgPool,
    pub jwt: Arc<JwtContext>,
}

impl AppState {
    pub fn try_new(config: AppConfig, db_pool: PgPool) -> Result<Self> {
        let secret_bytes = config.jwt.secret.as_bytes();
        let encoding = EncodingKey::from_secret(secret_bytes);
        let decoding = DecodingKey::from_secret(secret_bytes);

        let jwt = JwtContext {
            encoding,
            decoding,
            issuer: config.jwt.issuer.clone(),
            audience: config.jwt.audience.clone(),
            expiration: config.jwt.expiration,
        };

        Ok(Self {
            config,
            db_pool,
            jwt: Arc::new(jwt),
        })
    }
}

pub type SharedState = Arc<AppState>;
