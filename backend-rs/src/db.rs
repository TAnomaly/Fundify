use std::time::Duration;

use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};

use crate::config::AppConfig;

pub type DbPool = PgPool;

pub async fn init_pool(config: &AppConfig) -> Result<DbPool> {
    let pool = PgPoolOptions::new()
        .min_connections(2)
        .max_connections(16)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    Ok(pool)
}
