use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use uuid::Uuid;

use crate::{
    models::subscription::CreateSubscriptionRequest,
    state::AppState,
    auth::extractor::AuthUser,
    stripe_service::{StripeConfig, CreateCheckoutSessionRequest, CheckoutSessionResponse, PortalSessionResponse},
};

pub fn stripe_router() -> Router<AppState> {
    Router::new()
        .route("/config", get(get_stripe_config))
        .route("/create-checkout-session", post(create_checkout_session))
        .route("/create-portal-session", post(create_portal_session))
}

async fn get_stripe_config(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let config = state.stripe.get_config();
    
    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "publishableKey": config.publishable_key
        }
    })))
}

async fn create_checkout_session(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateCheckoutSessionRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Get tier details
    let tier = sqlx::query!(
        "SELECT mt.*, c.creator_id, c.id as campaign_id, u.name as creator_name 
         FROM membership_tiers mt 
         JOIN campaigns c ON mt.campaign_id = c.id 
         JOIN users u ON c.creator_id = u.id 
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

        // Check max subscribers
        if let Some(max_subscribers) = tier.max_subscribers {
            if tier.current_subscribers >= max_subscribers {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Tier has reached subscriber limit"
                    })),
                ));
            }
        }

        // Check existing subscription
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
                    "message": "You already have an active subscription to this creator"
                })),
            ));
        }

        // Create checkout session
        let session = state.stripe.create_checkout_session(
            user.id,
            user.email.clone(),
            user.name.clone(),
            payload.tier_id,
            payload.creator_id,
            tier.campaign_id,
            tier.name.clone(),
            tier.description.clone(),
            tier.price,
            tier.interval.clone(),
            tier.creator_name.clone(),
        ).await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to create checkout session"
                })),
            )
        })?;

        Ok(Json(serde_json::json!({
            "success": true,
            "data": {
                "sessionId": session.session_id,
                "url": session.url
            }
        })))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Tier not found"
            })),
        ))
    }
}

async fn create_portal_session(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // Get user's Stripe customer ID
    let user_data = sqlx::query!(
        "SELECT stripe_customer_id FROM users WHERE id = $1",
        user.id
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

    if let Some(user_data) = user_data {
        if let Some(customer_id) = user_data.stripe_customer_id {
            let session = state.stripe.create_portal_session(customer_id).await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to create portal session"
                    })),
                )
            })?;

            Ok(Json(serde_json::json!({
                "success": true,
                "data": {
                    "url": session.url
                }
            })))
        } else {
            Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "No Stripe customer found. Please create a subscription first."
                })),
            ))
        }
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "User not found"
            })),
        ))
    }
}
