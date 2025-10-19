mod auth;
mod config;
mod db;
mod error;
mod http;
mod media_service;
mod models;
mod routes;
mod state;
mod stripe_service;
mod utils;

use std::{env, net::SocketAddr};

use axum::{http::Method, Router};
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::AppConfig, db::init_pool, media_service::MediaService, routes::api_router,
    state::AppState, stripe_service::StripeService,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env()?;
    let pool = init_pool(&config).await?;
    let media_service = MediaService::new(&config)?;
    
    let stripe_service = StripeService::new(
        std::env::var("STRIPE_SECRET_KEY").unwrap_or_default(),
        std::env::var("STRIPE_PUBLISHABLE_KEY").unwrap_or_default(),
        std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default(),
        config.frontend_url.clone(),
    );
    
    let state = AppState::new(pool, config.clone(), media_service, stripe_service);

    let allowed_origin = axum::http::HeaderValue::from_str(&config.frontend_url).ok();

    let cors = if let Some(origin) = allowed_origin {
        CorsLayer::new()
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::PATCH,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
            ])
            .allow_origin(origin)
    } else {
        CorsLayer::permissive()
    };

    let middleware = ServiceBuilder::new().layer(TraceLayer::new_for_http());

    let app = Router::new()
        .nest("/api", api_router())
        .layer(cors)
        .layer(middleware)
        .with_state(state);

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(5000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
