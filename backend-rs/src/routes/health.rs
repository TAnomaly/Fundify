use axum::{extract::State, routing::get, Json, Router};
use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::state::SharedState;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    environment: String,
    timestamp: DateTime<Utc>,
    supabase_enabled: bool,
    database_max_connections: u32,
    database_connected: bool,
    jwt_issuer: String,
}

pub fn router() -> Router<SharedState> {
    Router::new().route("/health", get(health_check))
}

async fn health_check(State(state): State<SharedState>) -> Json<HealthResponse> {
    // Check database connectivity
    let database_connected = sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&state.db_pool)
        .await
        .is_ok();

    if !database_connected {
        tracing::warn!("Health check: database connectivity check failed");
    }

    let response = HealthResponse {
        status: "ok",
        service: "fundify-backend-rs",
        environment: std::env::var("APP_ENV").unwrap_or_else(|_| "development".to_string()),
        timestamp: Utc::now(),
        supabase_enabled: state.config.supabase.is_configured(),
        database_max_connections: state.config.database.max_connections,
        database_connected,
        jwt_issuer: state.jwt.issuer.clone(),
    };

    Json(response)
}
