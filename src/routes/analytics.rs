use axum::{
    extract::{Query, State},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::analytics_service::{
    get_analytics, get_subscribers, send_bulk_message, AnalyticsResponse, SubscriberListResponse,
    BulkMessageRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/analytics", get(handle_get_analytics))
        .route("/analytics/subscribers", get(handle_get_subscribers))
        .route("/analytics/bulk-message", post(handle_send_bulk_message))
}

#[derive(Debug, Deserialize)]
struct SubscriberQuery {
    page: Option<u32>,
    limit: Option<u32>,
    tier_id: Option<Uuid>,
    search: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct BulkMessageRequestPayload {
    #[validate(length(min = 1, max = 1000))]
    content: String,
    #[serde(default)]
    tier_ids: Vec<Uuid>,
    #[serde(default)]
    user_ids: Vec<Uuid>,
}

async fn handle_get_analytics(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<AnalyticsResponse>, AppError> {
    let analytics = get_analytics(&state, user_id).await?;
    Ok(Json(analytics))
}

async fn handle_get_subscribers(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<SubscriberQuery>,
) -> Result<Json<SubscriberListResponse>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let subscribers = get_subscribers(&state, user_id, page, limit, query.tier_id, query.search).await?;
    Ok(Json(subscribers))
}

async fn handle_send_bulk_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<BulkMessageRequestPayload>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = BulkMessageRequest {
        content: body.content,
        creator_id: user_id,
        tier_ids: body.tier_ids,
        user_ids: body.user_ids,
    };

    send_bulk_message(&state, input).await?;
    Ok(axum::http::StatusCode::OK)
}
