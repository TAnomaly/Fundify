use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::services::webhook_service::{handle_stripe_webhook, StripeWebhookResponse};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/webhooks/stripe", post(handle_stripe_webhook_handler))
}

#[derive(Debug, Deserialize)]
struct StripeWebhookRequest {
    #[serde(rename = "type")]
    event_type: String,
    data: serde_json::Value,
}

async fn handle_stripe_webhook_handler(
    State(state): State<SharedState>,
    Json(body): Json<StripeWebhookRequest>,
) -> Result<impl IntoResponse, AppError> {
    let result = handle_stripe_webhook(&state, body.event_type, body.data).await?;
    Ok((StatusCode::OK, Json(result)))
}
