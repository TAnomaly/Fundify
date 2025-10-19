use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    models::subscription::{
        CreateSubscriptionRequest, RecentSubscriptionsQuery, SubscribersResponse,
        SubscriptionsListResponse,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

#[derive(Debug, Deserialize)]
pub struct SubscriptionQuery {
    pub creator_id: Option<Uuid>,
    pub limit: Option<i32>,
}

pub fn subscriptions_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_subscription))
        .route("/my-subscriptions", get(get_my_subscriptions))
        .route("/my-subscribers", get(get_my_subscribers))
        .route("/recent", get(get_recent_subscriptions))
        .route("/:subscription_id/cancel", post(cancel_subscription))
        .route("/:subscription_id/toggle-pause", post(toggle_subscription_pause))
}

async fn create_subscription(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateSubscriptionRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Check if tier exists and is active
    let tier = sqlx::query!(
        "SELECT mt.*, c.creator_id FROM membership_tiers mt 
         JOIN campaigns c ON mt.campaign_id = c.id 
         WHERE mt.id = $1",
        payload.tier_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(tier) = tier {
        if !tier.is_active {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "This tier is no longer available"
                })),
            ));
        }

        if tier.creator_id != payload.creator_id {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Tier does not belong to this creator"
                })),
            ));
        }

        // Check max subscribers limit
        if let Some(max_subscribers) = tier.max_subscribers {
            if tier.current_subscribers >= max_subscribers {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "This tier has reached its subscriber limit"
                    })),
                ));
            }
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Membership tier not found"
            })),
        ));
    }

    // Check if already subscribed
    let existing_subscription = sqlx::query!(
        "SELECT id FROM subscriptions WHERE subscriber_id = $1 AND creator_id = $2 AND status = 'ACTIVE'",
        user.id,
        payload.creator_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if existing_subscription.is_some() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "You are already subscribed to this creator"
            })),
        ));
    }

    // Calculate next billing date
    let start_date = chrono::Utc::now();
    let next_billing_date = if tier.interval == "MONTHLY" {
        start_date + chrono::Duration::days(30)
    } else {
        start_date + chrono::Duration::days(365)
    };

    // Create subscription
    let subscription_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO subscriptions (id, subscriber_id, creator_id, tier_id, status, start_date, next_billing_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8)",
        subscription_id,
        user.id,
        payload.creator_id,
        payload.tier_id,
        start_date,
        next_billing_date,
        now,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to create subscription"
            })),
        )
    })?;

    // Update tier subscriber count
    sqlx::query!(
        "UPDATE membership_tiers SET current_subscribers = current_subscribers + 1 WHERE id = $1",
        payload.tier_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to update tier subscriber count"
            })),
        )
    })?;

    // Fetch the created subscription with details
    let subscription_with_details = sqlx::query_as!(
        crate::models::subscription::SubscriptionWithDetails,
        r#"
        SELECT 
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.created_at,
            s.updated_at,
            mt.id as "tier_id",
            mt.name as "tier_name",
            mt.description as "tier_description",
            mt.price as "tier_price",
            mt.interval as "tier_interval",
            mt.perks as "tier_perks",
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar",
            sub.id as "subscriber_id",
            sub.name as "subscriber_name",
            sub.avatar as "subscriber_avatar",
            sub.email as "subscriber_email"
        FROM subscriptions s
        JOIN membership_tiers mt ON s.tier_id = mt.id
        JOIN users u ON s.creator_id = u.id
        JOIN users sub ON s.subscriber_id = sub.id
        WHERE s.id = $1
        "#,
        subscription_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to fetch created subscription"
            })),
        )
    })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": subscription_with_details
    })))
}

async fn get_my_subscriptions(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<SubscriptionsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let subscriptions = sqlx::query_as!(
        crate::models::subscription::SubscriptionWithDetails,
        r#"
        SELECT 
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.created_at,
            s.updated_at,
            mt.id as "tier_id",
            mt.name as "tier_name",
            mt.description as "tier_description",
            mt.price as "tier_price",
            mt.interval as "tier_interval",
            mt.perks as "tier_perks",
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar",
            NULL as "subscriber_id",
            NULL as "subscriber_name",
            NULL as "subscriber_avatar",
            NULL as "subscriber_email"
        FROM subscriptions s
        JOIN membership_tiers mt ON s.tier_id = mt.id
        JOIN users u ON s.creator_id = u.id
        WHERE s.subscriber_id = $1
        ORDER BY s.created_at DESC
        "#,
        user.id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(SubscriptionsListResponse {
        success: true,
        data: subscriptions,
    }))
}

async fn get_my_subscribers(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<SubscribersResponse>, (StatusCode, Json<serde_json::Value>)> {
    let subscriptions = sqlx::query_as!(
        crate::models::subscription::SubscriptionWithDetails,
        r#"
        SELECT 
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.created_at,
            s.updated_at,
            mt.id as "tier_id",
            mt.name as "tier_name",
            mt.description as "tier_description",
            mt.price as "tier_price",
            mt.interval as "tier_interval",
            mt.perks as "tier_perks",
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar",
            sub.id as "subscriber_id",
            sub.name as "subscriber_name",
            sub.avatar as "subscriber_avatar",
            sub.email as "subscriber_email"
        FROM subscriptions s
        JOIN membership_tiers mt ON s.tier_id = mt.id
        JOIN users u ON s.creator_id = u.id
        JOIN users sub ON s.subscriber_id = sub.id
        WHERE s.creator_id = $1 AND s.status = 'ACTIVE'
        ORDER BY s.created_at DESC
        "#,
        user.id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    // Calculate stats
    let total_subscribers = subscriptions.len() as i32;
    let monthly_revenue = subscriptions.iter().fold(0.0, |sum, sub| {
        let amount = if sub.tier.interval == "MONTHLY" {
            sub.tier.price
        } else {
            sub.tier.price / 12.0
        };
        sum + amount
    });

    Ok(Json(SubscribersResponse {
        success: true,
        data: crate::models::subscription::SubscribersData {
            subscriptions,
            stats: crate::models::subscription::SubscriberStats {
                total_subscribers,
                monthly_revenue: (monthly_revenue * 100.0).round() / 100.0,
            },
        },
    }))
}

async fn get_recent_subscriptions(
    State(state): State<AppState>,
    Query(params): Query<SubscriptionQuery>,
) -> Result<Json<SubscriptionsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let creator_id = params.creator_id.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Creator ID is required"
            })),
        )
    })?;

    let limit = params.limit.unwrap_or(10).min(50); // Max 50 results

    let subscriptions = sqlx::query_as!(
        crate::models::subscription::SubscriptionWithDetails,
        r#"
        SELECT 
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.created_at,
            s.updated_at,
            mt.id as "tier_id",
            mt.name as "tier_name",
            mt.description as "tier_description",
            mt.price as "tier_price",
            mt.interval as "tier_interval",
            mt.perks as "tier_perks",
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar",
            sub.id as "subscriber_id",
            sub.name as "subscriber_name",
            sub.avatar as "subscriber_avatar",
            sub.email as "subscriber_email"
        FROM subscriptions s
        JOIN membership_tiers mt ON s.tier_id = mt.id
        JOIN users u ON s.creator_id = u.id
        JOIN users sub ON s.subscriber_id = sub.id
        WHERE s.creator_id = $1 AND s.status = 'ACTIVE'
        ORDER BY s.created_at DESC
        LIMIT $2
        "#,
        creator_id,
        limit
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(SubscriptionsListResponse {
        success: true,
        data: subscriptions,
    }))
}

async fn cancel_subscription(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(subscription_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Check if subscription exists and user owns it
    let subscription = sqlx::query!(
        "SELECT id, subscriber_id, status, next_billing_date, tier_id FROM subscriptions WHERE id = $1",
        subscription_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(subscription) = subscription {
        if subscription.subscriber_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized"
                })),
            ));
        }

        if subscription.status != "ACTIVE" {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Subscription is not active"
                })),
            ));
        }

        // Cancel subscription
        let now = chrono::Utc::now();
        sqlx::query!(
            "UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = $1, end_date = $2, updated_at = $3 WHERE id = $4",
            now,
            subscription.next_billing_date,
            now,
            subscription_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to cancel subscription"
                })),
            )
        })?;

        // Update tier subscriber count
        sqlx::query!(
            "UPDATE membership_tiers SET current_subscribers = current_subscribers - 1 WHERE id = $1",
            subscription.tier_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to update tier subscriber count"
                })),
            )
        })?;

        Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("Subscription cancelled. You will have access until {}", subscription.next_billing_date.format("%Y-%m-%d"))
        })))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Subscription not found"
            })),
        ))
    }
}

async fn toggle_subscription_pause(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(subscription_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Check if subscription exists and user owns it
    let subscription = sqlx::query!(
        "SELECT id, subscriber_id, status FROM subscriptions WHERE id = $1",
        subscription_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(subscription) = subscription {
        if subscription.subscriber_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized"
                })),
            ));
        }

        let new_status = if subscription.status == "ACTIVE" { "PAUSED" } else { "ACTIVE" };
        let message = if new_status == "PAUSED" { "Subscription paused" } else { "Subscription resumed" };

        sqlx::query!(
            "UPDATE subscriptions SET status = $1, updated_at = $2 WHERE id = $3",
            new_status,
            chrono::Utc::now(),
            subscription_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to update subscription"
                })),
            )
        })?;

        Ok(Json(serde_json::json!({
            "success": true,
            "message": message
        })))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Subscription not found"
            })),
        ))
    }
}
