mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use axum::{
    routing::{get, post},
    Router,
};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::utils::app_state::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "fundify_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Fundify Backend (Rust + Axum)");

    // Database connection
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(50)
        .connect(&database_url)
        .await?;

//     tracing::info!("Running database migrations...");
//     sqlx::migrate!("./migrations")
//         .run(&pool)

    tracing::info!("Database ready!");

    // Application state
    let state = AppState::new(pool);

    // Build CORS layer
    let cors = CorsLayer::permissive();

    // Build application router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/health", get(health_check))
        // Auth routes
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/me", get(handlers::auth::get_me))
        // User routes
        .route("/api/users/:id", get(handlers::users::get_user))
        .route("/api/users/:id", post(handlers::users::update_user))
        // Campaign routes
        .route("/api/campaigns", get(handlers::campaigns::list_campaigns))
        .route("/api/campaigns", post(handlers::campaigns::create_campaign))
        .route("/api/campaigns/:id", get(handlers::campaigns::get_campaign))
        .route("/api/campaigns/:id", post(handlers::campaigns::update_campaign))
        // Donation routes
        .route("/api/donations", post(handlers::donations::create_donation))
        .route("/api/campaigns/:id/donations", get(handlers::donations::list_donations))
        // Comment routes
        .route("/api/campaigns/:id/comments", get(handlers::comments::list_comments))
        .route("/api/campaigns/:id/comments", post(handlers::comments::create_comment))
        // Subscription routes
        .route("/api/subscriptions", post(handlers::subscriptions::create_subscription))
        .route("/api/subscriptions/:id", get(handlers::subscriptions::get_subscription))
        .route("/api/subscriptions/:id/cancel", post(handlers::subscriptions::cancel_subscription))
        // Membership Tier routes
        .route("/api/memberships", get(handlers::memberships::list_tiers))
        .route("/api/memberships", post(handlers::memberships::create_tier))
        // Creator Post routes
        .route("/api/posts", get(handlers::posts::list_posts))
        .route("/api/posts", post(handlers::posts::create_post))
        .route("/api/posts/:id", get(handlers::posts::get_post))
        // Article routes
        .route("/api/articles", get(handlers::articles::list_articles))
        .route("/api/articles", post(handlers::articles::create_article))
        .route("/api/articles/:slug", get(handlers::articles::get_article))
        // Event routes
        .route("/api/events", get(handlers::events::list_events))
        .route("/api/events", post(handlers::events::create_event))
        .route("/api/events/:id", get(handlers::events::get_event))
        .route("/api/events/:id/rsvp", post(handlers::events::rsvp_event))
        // Poll routes
        .route("/api/polls", get(handlers::polls::list_polls))
        .route("/api/polls", post(handlers::polls::create_poll))
        .route("/api/polls/:id/vote", post(handlers::polls::vote_poll))
        // Stripe routes
        .route("/api/stripe/create-checkout-session", post(handlers::stripe::create_checkout_session))
        .route("/api/stripe/create-connect-account", post(handlers::stripe::create_connect_account))
        .route("/api/webhooks/stripe", post(handlers::stripe::webhook))
        // Notification routes
        .route("/api/notifications", get(handlers::notifications::list_notifications))
        .route("/api/notifications/:id/read", post(handlers::notifications::mark_read))
        // Message routes
        .route("/api/messages", get(handlers::messages::list_messages))
        .route("/api/messages", post(handlers::messages::send_message))
        // Feed routes
        .route("/api/feed", get(handlers::feed::get_feed))
        .layer(cors)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let port = env::var("PORT")
        .unwrap_or_else(|_| "4000".to_string())
        .parse::<u16>()
        .unwrap_or(4000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}
