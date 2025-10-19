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

    tracing::info!("Starting Fundify Rust Backend");

    tracing::info!("Loading configuration from environment");
    let config = AppConfig::from_env().map_err(|e| {
        tracing::error!("Failed to load configuration: {}", e);
        e
    })?;
    tracing::info!("Configuration loaded successfully");

    tracing::info!("Connecting to database: {}", &config.database.url.split('@').last().unwrap_or("unknown"));
    let pool = PgPoolOptions::new()
        .max_connections(config.database.max_connections)
        .acquire_timeout(config.database.acquire_timeout)
        .connect(&config.database.url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            e
        })?;
    tracing::info!("Database connected successfully");

    tracing::info!("Initializing application state");
    let state = Arc::new(AppState::try_new(config.clone(), pool)?);
    let app = routes::create_router(state.clone());

    let bind_address = config.server.bind_address();
    tracing::info!("Binding to {}", bind_address);
    let listener = TcpListener::bind(&bind_address).await.map_err(|e| {
        tracing::error!("Failed to bind to {}: {}", bind_address, e);
        e
    })?;
    tracing::info!("✓ Backend API listening on {}", bind_address);
    tracing::info!("✓ Health check available at http://{}/health", bind_address);

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
