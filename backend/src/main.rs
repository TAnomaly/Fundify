use axum::{
    extract::{DefaultBodyLimit, State},
    http::{HeaderName, HeaderValue, Method, StatusCode},
    response::Json,
    routing::get,
    Router,
};
use std::net::SocketAddr;
use std::path::PathBuf;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowOrigin, CorsLayer},
    services::ServeDir,
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod amqp_client;
mod auth;
mod config;
mod database;
mod middleware;
mod models;
mod redis_client;
mod routes;

use config::Config;
use database::Database;
use routes::{
    analytics::analytics_routes, articles::articles_routes, auth::auth_routes,
    campaigns::campaign_routes, creators::creator_routes, events::event_routes, feed::feed_routes,
    podcasts::podcast_routes, posts::post_routes, products::product_routes,
    purchases::purchase_routes, referrals::referral_routes, search::search_routes,
    uploads::upload_routes, users::user_routes,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "funify_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env()?;

    // Initialize database with Redis and CloudAMQP
    let db = Database::with_all(&config.database_url, &config.redis_url, &config.cloud_amqp_url).await?;

    // Run migrations (log and continue if they fail so healthcheck can still succeed)
    if let Err(error) = db.run_migrations().await {
        tracing::error!("Database migrations failed: {}", error);
    }

    // Prepare upload directories
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());
    let upload_path = PathBuf::from(&upload_dir);
    if let Err(error) = tokio::fs::create_dir_all(upload_path.join("images")).await {
        tracing::warn!("Failed to create images upload directory: {}", error);
    }
    if let Err(error) = tokio::fs::create_dir_all(upload_path.join("videos")).await {
        tracing::warn!("Failed to create videos upload directory: {}", error);
    }

    // Build our application with routes
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::mirror_request())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("accept"),
            HeaderName::from_static("origin"),
            HeaderName::from_static("x-requested-with"),
        ])
        .allow_credentials(true);

    let uploads_service = ServiceBuilder::new()
        .layer(cors.clone())
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("cross-origin-resource-policy"),
            HeaderValue::from_static("cross-origin"),
        ))
        .service(ServeDir::new(upload_path.clone()));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/redis/stats", get(redis_stats))
        .nest("/api/auth", auth_routes())
        .nest("/api/users", user_routes())
        .nest("/api/creators", creator_routes())
        .nest("/api/posts", post_routes())
        .nest("/api/products", product_routes())
        .nest("/api/purchases", purchase_routes())
        .nest("/api/analytics", analytics_routes())
        .nest("/api/campaigns", campaign_routes())
        .nest("/api/events", event_routes())
        .nest("/api/feed", feed_routes())
        .nest("/api/articles", articles_routes())
        .nest("/api/referrals", referral_routes())
        .nest("/api/podcasts", podcast_routes())
        .nest("/api/search", search_routes())
        .nest("/api/upload", upload_routes())
        .route("/api/notifications", get(get_notifications))
        .route("/api/subscriptions/my-subscribers", get(get_my_subscribers))
        .nest_service("/uploads", uploads_service)
        .layer(
            ServiceBuilder::new()
                .layer(CompressionLayer::new()) // Compress responses (gzip, br, deflate)
                .layer(TraceLayer::new_for_http())
                .layer(cors)
                .layer(axum::middleware::from_fn(middleware::auth_middleware))
                .layer(DefaultBodyLimit::max(600 * 1024 * 1024)), // 600MB limit
        )
        .with_state(db);

    // Run the server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Server running on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

async fn redis_stats(State(db): State<Database>) -> Result<Json<serde_json::Value>, StatusCode> {
    if let Some(redis) = &db.redis {
        let mut redis_clone = redis.clone();
        match redis_clone.get_stats().await {
            Ok(stats) => Ok(Json(serde_json::json!({
                "success": true,
                "redis_connected": true,
                "stats": stats
            }))),
            Err(e) => {
                tracing::error!("Redis stats error: {}", e);
                Ok(Json(serde_json::json!({
                    "success": false,
                    "redis_connected": true,
                    "error": "Failed to get stats"
                })))
            }
        }
    } else {
        Ok(Json(serde_json::json!({
            "success": false,
            "redis_connected": false,
            "message": "Redis not configured"
        })))
    }
}

async fn get_notifications() -> Result<Json<serde_json::Value>, StatusCode> {
    // Mock notifications for now
    let response = serde_json::json!({
        "success": true,
        "data": []
    });

    Ok(Json(response))
}

async fn get_my_subscribers() -> Result<Json<serde_json::Value>, StatusCode> {
    // Mock subscribers for now
    let response = serde_json::json!({
        "success": true,
        "data": {
            "subscriptions": []
        }
    });

    Ok(Json(response))
}
