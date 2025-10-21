mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use axum::{
    extract::{Request, State},
    http::HeaderValue,
    middleware::{from_fn, Next},
    response::Response,
    routing::{delete, get, options, post, put},
    Router,
};
use dotenvy::dotenv;
use sqlx::{postgres::PgPoolOptions, Row};
use std::env;
use std::net::SocketAddr;
use tower_http::{compression::CompressionLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::utils::app_state::AppState;

// Custom CORS middleware for more sophisticated origin checking
async fn cors_middleware(request: Request, next: Next) -> Response {
    let origin = request.headers().get("origin").cloned();

    // Static allowed origins
    let static_origins = vec![
        "http://localhost:3000",
        "http://localhost:3001",
        "https://funify.vercel.app",
        "https://fundify.vercel.app",
        "https://perfect-happiness-production.up.railway.app",
        "https://fundify-frontend.vercel.app",
        "https://fundify-app.vercel.app",
    ];

    // Get environment origins
    let env_origins: Vec<String> = [
        env::var("CORS_ORIGIN").ok(),
        env::var("FRONTEND_URL").ok(),
        env::var("NEXT_PUBLIC_FRONTEND_URL").ok(),
        env::var("NEXT_PUBLIC_SITE_URL").ok(),
        env::var("ADMIN_DASHBOARD_ORIGIN").ok(),
        env::var("ALLOWED_ORIGINS").ok(),
        env::var("CORS_ORIGINS").ok(),
    ]
    .into_iter()
    .flatten()
    .flat_map(|s| {
        s.split(',')
            .map(|s| s.trim().to_string())
            .collect::<Vec<_>>()
    })
    .collect();

    let mut response = next.run(request).await;

    // Check if origin is allowed
    let is_allowed = if let Some(origin_header) = &origin {
        let origin_str = origin_header.to_str().unwrap_or("");
        let normalized = origin_str.trim().to_lowercase();

        // Check static origins
        let static_allowed = static_origins
            .iter()
            .any(|&allowed| allowed.trim().to_lowercase() == normalized);

        // Check environment origins
        let env_allowed = env_origins
            .iter()
            .any(|allowed| allowed.trim().to_lowercase() == normalized);

        // Check wildcard patterns
        let wildcard_allowed =
            normalized.ends_with(".vercel.app") || normalized.ends_with(".railway.app");

        static_allowed || env_allowed || wildcard_allowed
    } else {
        true // Allow requests without origin (like Postman, curl, etc.)
    };

    if is_allowed {
        if let Some(origin_header) = origin {
            response
                .headers_mut()
                .insert("access-control-allow-origin", origin_header);
        } else if env::var("NODE_ENV").unwrap_or_default() != "production" {
            response
                .headers_mut()
                .insert("access-control-allow-origin", HeaderValue::from_static("*"));
        }

        response.headers_mut().insert(
            "access-control-allow-credentials",
            HeaderValue::from_static("true"),
        );

        response.headers_mut().insert(
            "access-control-allow-methods",
            HeaderValue::from_static("GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"),
        );

        response.headers_mut().insert(
            "access-control-allow-headers",
            HeaderValue::from_static("Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Accept-Language")
        );

        response
            .headers_mut()
            .insert("vary", HeaderValue::from_static("Origin"));
    }

    response
}

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

    tracing::info!(
        "Starting Fundify Backend (Rust + Axum) - CORS Fixed - Database Fixed - Railway Ready"
    );

    // Database connection
    // Prefer DATABASE_URL, fall back to NEON_DATABASE_URL, finally use default Neon connection for local dev.
    let database_url = env::var("DATABASE_URL")
        .or_else(|_| env::var("NEON_DATABASE_URL"))
        .unwrap_or_else(|_| {
            // Default public Neon database used for shared development/testing
            "postgresql://neondb_owner:npg_rRLz5k8qTHnc@ep-fancy-tooth-abl09hty-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require".to_string()
        });

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

    // CORS is now handled by custom middleware below

    // Build application router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/health", get(health_check))
        .route("/api/test", get(test_endpoint))
        .route("/api/campaigns-simple", get(simple_campaigns))
        .route("/api/debug-campaigns", get(debug_campaigns))
        .route("/api/simple-campaigns-list", get(simple_campaigns_list))
        .route("/api/test-campaigns", get(test_campaigns))
        // Auth routes
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/me", get(handlers::auth::get_me))
        // User routes
        .route("/api/users/creators", get(handlers::users::get_creators))
        .route(
            "/api/users/creators/:username",
            get(handlers::users::get_creator_by_username),
        )
        .route("/api/users/:id", get(handlers::users::get_user))
        .route("/api/users/:id", post(handlers::users::update_user))
        // Campaign routes
        .route("/api/campaigns", get(handlers::campaigns::list_campaigns))
        .route("/api/campaigns", post(handlers::campaigns::create_campaign))
        .route("/api/campaigns", options(|| async { "OK" }))
        .route("/api/campaigns/:id", get(handlers::campaigns::get_campaign))
        .route(
            "/api/campaigns/:id",
            post(handlers::campaigns::update_campaign),
        )
        // Donation routes
        .route("/api/donations", post(handlers::donations::create_donation))
        .route(
            "/api/donations/me",
            get(handlers::donations::get_my_donations),
        )
        .route(
            "/api/campaigns/:id/donations",
            get(handlers::donations::list_donations),
        )
        // Comment routes
        .route(
            "/api/campaigns/:id/comments",
            get(handlers::comments::get_comments_by_campaign),
        )
        .route("/api/comments", post(handlers::comments::create_comment))
        .route("/api/comments/:id", put(handlers::comments::update_comment))
        .route(
            "/api/comments/:id",
            delete(handlers::comments::delete_comment),
        )
        // Subscription routes
        .route(
            "/api/subscriptions",
            post(handlers::subscriptions::create_subscription),
        )
        .route(
            "/api/subscriptions/:id",
            get(handlers::subscriptions::get_subscription),
        )
        .route(
            "/api/subscriptions/:id/cancel",
            post(handlers::subscriptions::cancel_subscription),
        )
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
        .route(
            "/api/stripe/create-checkout-session",
            post(handlers::stripe::create_checkout_session),
        )
        .route(
            "/api/stripe/create-connect-account",
            post(handlers::stripe::create_connect_account),
        )
        .route("/api/webhooks/stripe", post(handlers::stripe::webhook))
        // Notification routes
        .route(
            "/api/notifications",
            get(handlers::notifications::list_notifications),
        )
        .route("/api/notifications", options(|| async { "OK" }))
        .route(
            "/api/notifications/:id/read",
            post(handlers::notifications::mark_read),
        )
        .route(
            "/api/notifications/read-all",
            post(handlers::notifications::mark_all_read),
        )
        // Message routes
        .route("/api/messages", get(handlers::messages::list_messages))
        .route("/api/messages", post(handlers::messages::send_message))
        // Feed routes
        .route("/api/feed", get(handlers::feed::get_feed))
        .route("/api/feed", options(|| async { "OK" }))
        .layer(from_fn(cors_middleware))
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

async fn test_endpoint() -> &'static str {
    "Test endpoint working"
}

async fn simple_campaigns(State(state): State<AppState>) -> Result<String, String> {
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM \"Campaign\"")
        .fetch_one(&state.db)
        .await
    {
        Ok(count) => Ok(format!("Found {} campaigns", count)),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

async fn debug_campaigns(State(state): State<AppState>) -> Result<String, String> {
    match sqlx::query("SELECT DISTINCT status FROM \"Campaign\" LIMIT 10")
        .fetch_all(&state.db)
        .await
    {
        Ok(rows) => {
            let statuses: Vec<String> = rows.into_iter().map(|row| row.get::<String, _>("status")).collect();
            Ok(format!("Campaign statuses: {:?}", statuses))
        },
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

async fn simple_campaigns_list(State(state): State<AppState>) -> Result<String, String> {
    match sqlx::query("SELECT id, title, status FROM \"Campaign\" LIMIT 5")
        .fetch_all(&state.db)
        .await
    {
        Ok(rows) => {
            let campaigns: Vec<String> = rows.into_iter()
                .map(|row| {
                    let id: String = row.get("id");
                    let title: String = row.get("title");
                    let status: String = row.get("status");
                    format!("{}: {} ({})", id, title, status)
                })
                .collect();
            Ok(format!("Campaigns: {:?}", campaigns))
        },
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

async fn test_campaigns(State(state): State<AppState>) -> Result<String, String> {
    match sqlx::query("SELECT COUNT(*) FROM \"Campaign\"")
        .fetch_one(&state.db)
        .await
    {
        Ok(row) => {
            let count: i64 = row.get(0);
            Ok(format!("Found {} campaigns", count))
        },
        Err(e) => Err(format!("Database error: {}", e)),
    }
}
