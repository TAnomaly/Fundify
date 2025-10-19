use axum::{routing::get, Router};
use serde::Serialize;

use crate::{http, state::AppState};

#[derive(Debug, Serialize)]
struct HealthPayload {
    status: &'static str,
}

async fn health_check() -> axum::response::Response {
    http::success(HealthPayload { status: "ok" })
}

pub fn router() -> Router<AppState> {
    Router::new().route("/health", get(health_check))
}
