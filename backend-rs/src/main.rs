mod config;
mod error;
mod middleware;
mod models;
mod routes;
mod services;
mod state;
mod utils;

use crate::config::AppConfig;
use crate::state::AppState;
use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .init();

    let config = AppConfig::from_env()?;

    let pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .acquire_timeout(config.database.acquire_timeout)
        .connect(&config.database.url)
        .await?;

    let state = Arc::new(AppState::try_new(config.clone(), pool)?);
    let app = routes::create_router(state.clone());

    let bind_address = config.server.bind_address();
    let listener = TcpListener::bind(&bind_address).await?;
    tracing::info!("Backend API listening on {}", bind_address);

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
