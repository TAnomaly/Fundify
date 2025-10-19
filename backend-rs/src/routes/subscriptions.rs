use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::membership::SubscriptionWithDetails;
use crate::services::subscription_service::{
    cancel_subscription, create_subscription, get_recent_subscriptions, list_my_subscribers,
    list_my_subscriptions, toggle_subscription_pause, SubscriptionInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/subscriptions", post(handle_create_subscription))
        .route(
            "/subscriptions/my-subscriptions",
            get(handle_list_my_subscriptions),
        )
        .route(
            "/subscriptions/my-subscribers",
            get(handle_list_my_subscribers),
        )
        .route("/subscriptions/recent", get(handle_recent_subscriptions))
        .route(
            "/subscriptions/:id/cancel",
            post(handle_cancel_subscription),
        )
        .route(
            "/subscriptions/:id/toggle-pause",
            post(handle_toggle_subscription_pause),
        )
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateSubscriptionRequest {
    tier_id: Uuid,
    creator_id: Uuid,
}

async fn handle_create_subscription(
    State(state): State<SharedState>,
    AuthUser {
        id: subscriber_id, ..
    }: AuthUser,
    Json(body): Json<CreateSubscriptionRequest>,
) -> Result<Json<SubscriptionWithDetails>, AppError> {
    body.validate()?;
    let subscription = create_subscription(
        &state,
        subscriber_id,
        SubscriptionInput {
            tier_id: body.tier_id,
            creator_id: body.creator_id,
        },
    )
    .await?;

    Ok(Json(subscription))
}

async fn handle_list_my_subscriptions(
    State(state): State<SharedState>,
    AuthUser {
        id: subscriber_id, ..
    }: AuthUser,
) -> Result<Json<Vec<SubscriptionWithDetails>>, AppError> {
    let subscriptions = list_my_subscriptions(&state, subscriber_id).await?;
    Ok(Json(subscriptions))
}

async fn handle_list_my_subscribers(
    State(state): State<SharedState>,
    AuthUser { id: creator_id, .. }: AuthUser,
) -> Result<Json<Vec<SubscriptionWithDetails>>, AppError> {
    let subscribers = list_my_subscribers(&state, creator_id).await?;
    Ok(Json(subscribers))
}

#[derive(Debug, Deserialize)]
struct RecentSubscriptionsQuery {
    creator_id: Uuid,
    #[serde(default = "default_recent_limit")]
    limit: i64,
}

fn default_recent_limit() -> i64 {
    10
}

async fn handle_recent_subscriptions(
    State(state): State<SharedState>,
    Query(query): Query<RecentSubscriptionsQuery>,
) -> Result<Json<Vec<SubscriptionWithDetails>>, AppError> {
    let list = get_recent_subscriptions(&state, query.creator_id, query.limit).await?;
    Ok(Json(list))
}

async fn handle_cancel_subscription(
    State(state): State<SharedState>,
    AuthUser {
        id: requester_id, ..
    }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<crate::models::membership::Subscription>, AppError> {
    let subscription = cancel_subscription(&state, id, requester_id).await?;
    Ok(Json(subscription))
}

async fn handle_toggle_subscription_pause(
    State(state): State<SharedState>,
    AuthUser {
        id: requester_id, ..
    }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<crate::models::membership::Subscription>, AppError> {
    let subscription = toggle_subscription_pause(&state, id, requester_id).await?;
    Ok(Json(subscription))
}
