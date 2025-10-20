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
    // Debug: Print to stdout BEFORE any other initialization
    println!("=== FUNDIFY BACKEND STARTING ===");
    println!("Rust binary is executing...");

    dotenvy::dotenv().ok();
    println!("Dotenv loaded");

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .init();

    println!("Tracing initialized");

    tracing::info!("Starting Fundify Rust Backend");

    tracing::info!("Loading configuration from environment");
    let config = AppConfig::from_env().map_err(|e| {
        tracing::error!("Failed to load configuration: {}", e);
        e
    })?;
    tracing::info!("Configuration loaded successfully");

    tracing::info!("Connecting to database: {}", &config.database.url.split('@').last().unwrap_or("unknown"));

    // Retry database connection with exponential backoff
    // Railway health check timeout is ~100s, so we keep retries under that
    let max_retries = 8;
    let mut retry_count = 0;
    let pool = loop {
        match PgPoolOptions::new()
            .max_connections(config.database.max_connections)
            .acquire_timeout(config.database.acquire_timeout)
            .connect(&config.database.url)
            .await
        {
            Ok(pool) => {
                tracing::info!("✓ Database connected successfully on attempt {}", retry_count + 1);
                break pool;
            }
            Err(e) => {
                retry_count += 1;
                if retry_count >= max_retries {
                    tracing::error!("Failed to connect to database after {} attempts: {}", max_retries, e);
                    tracing::error!("Database URL host: {}", config.database.url.split('@').last().unwrap_or("unknown"));
                    return Err(e.into());
                }
                // Shorter waits: 1s, 2s, 4s, 8s, 10s, 10s, 10s (total ~55s max)
                let wait_secs = std::cmp::min(2_u64.pow(retry_count - 1), 10);
                tracing::warn!(
                    "Database connection attempt {}/{} failed: {}. Retrying in {}s...",
                    retry_count,
                    max_retries,
                    e,
                    wait_secs
                );
                tokio::time::sleep(tokio::time::Duration::from_secs(wait_secs)).await;
            }
        }
    };

    // Run database migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to run migrations: {}", e);
            e
        })?;
    tracing::info!("✓ Database migrations completed successfully");

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
