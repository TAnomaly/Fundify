use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::Json,
    routing::post,
    Router,
};
use serde_json::Value;
use uuid::Uuid;

use crate::{
    state::AppState,
    stripe_service::StripeService,
};

pub fn webhooks_router() -> Router<AppState> {
    Router::new()
        .route("/stripe", post(handle_stripe_webhook))
}

async fn handle_stripe_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let signature = headers
        .get("stripe-signature")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "No stripe-signature header"
                })),
            )
        })?;

    // Verify webhook signature
    let event = stripe::Webhook::construct_event(&body, signature, &state.stripe.webhook_secret)
        .map_err(|e| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("Webhook signature verification failed: {}", e)
                })),
            )
        })?;

    tracing::info!("Received webhook: {}", event.event_type);

    match event.event_type.as_str() {
        "checkout.session.completed" => {
            handle_checkout_session_completed(&state, &event.data).await?;
        }
        "customer.subscription.updated" => {
            handle_subscription_updated(&state, &event.data).await?;
        }
        "customer.subscription.deleted" => {
            handle_subscription_deleted(&state, &event.data).await?;
        }
        "invoice.payment_succeeded" => {
            handle_invoice_payment_succeeded(&state, &event.data).await?;
        }
        "invoice.payment_failed" => {
            handle_invoice_payment_failed(&state, &event.data).await?;
        }
        _ => {
            tracing::info!("Unhandled event type: {}", event.event_type);
        }
    }

    Ok(Json(serde_json::json!({ "received": true })))
}

async fn handle_checkout_session_completed(
    state: &AppState,
    data: &Value,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let session = data.get("object").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid webhook data"
            })),
        )
    })?;

    let session_id = session.get("id").and_then(|v| v.as_str()).ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Missing session ID"
            })),
        )
    })?;

    let metadata = session.get("metadata").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Missing metadata"
            })),
        )
    })?;

    let user_id = metadata
        .get("userId")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid user ID"
                })),
            )
        })?;

    let tier_id = metadata
        .get("tierId")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid tier ID"
                })),
            )
        })?;

    let creator_id = metadata
        .get("creatorId")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Invalid creator ID"
                })),
            )
        })?;

    let stripe_subscription_id = session
        .get("subscription")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing subscription ID"
                })),
            )
        })?;

    let customer_id = session
        .get("customer")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing customer ID"
                })),
            )
        })?;

    // Check if subscription already exists
    let existing_subscription = sqlx::query!(
        "SELECT id FROM subscriptions WHERE stripe_subscription_id = $1",
        stripe_subscription_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    if existing_subscription.is_some() {
        tracing::info!("Subscription already exists: {}", stripe_subscription_id);
        return Ok(());
    }

    // Get tier details
    let tier = sqlx::query!(
        "SELECT interval FROM membership_tiers WHERE id = $1",
        tier_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    if tier.is_none() {
        tracing::error!("Tier not found: {}", tier_id);
        return Ok(());
    }

    let tier = tier.unwrap();

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
        "INSERT INTO subscriptions (id, subscriber_id, creator_id, tier_id, status, start_date, next_billing_date, stripe_subscription_id, stripe_customer_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8, $9, $10)",
        subscription_id,
        user_id,
        creator_id,
        tier_id,
        start_date,
        next_billing_date,
        stripe_subscription_id,
        customer_id,
        now,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to create subscription"
            })),
        )
    })?;

    // Update tier subscriber count
    sqlx::query!(
        "UPDATE membership_tiers SET current_subscribers = current_subscribers + 1 WHERE id = $1",
        tier_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to update tier subscriber count"
            })),
        )
    })?;

    // Update user's Stripe customer ID
    sqlx::query!(
        "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
        customer_id,
        user_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to update user Stripe customer ID"
            })),
        )
    })?;

    tracing::info!("Subscription created: {}", subscription_id);
    Ok(())
}

async fn handle_subscription_updated(
    state: &AppState,
    data: &Value,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let subscription = data.get("object").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid webhook data"
            })),
        )
    })?;

    let stripe_subscription_id = subscription
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing subscription ID"
                })),
            )
        })?;

    let status = subscription
        .get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing status"
                })),
            )
        })?;

    // Map Stripe status to our status
    let our_status = match status {
        "canceled" => "CANCELLED",
        "paused" => "PAUSED",
        "past_due" | "unpaid" => "EXPIRED",
        _ => "ACTIVE",
    };

    // Get current period end for next billing date
    let next_billing_date = subscription
        .get("current_period_end")
        .and_then(|v| v.as_i64())
        .map(|timestamp| chrono::DateTime::from_timestamp(timestamp, 0))
        .flatten()
        .unwrap_or_else(|| chrono::Utc::now());

    // Update subscription
    sqlx::query!(
        "UPDATE subscriptions SET status = $1, next_billing_date = $2, updated_at = $3 WHERE stripe_subscription_id = $4",
        our_status,
        next_billing_date,
        chrono::Utc::now(),
        stripe_subscription_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to update subscription"
            })),
        )
    })?;

    tracing::info!("Subscription updated: {} -> {}", stripe_subscription_id, our_status);
    Ok(())
}

async fn handle_subscription_deleted(
    state: &AppState,
    data: &Value,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let subscription = data.get("object").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid webhook data"
            })),
        )
    })?;

    let stripe_subscription_id = subscription
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing subscription ID"
                })),
            )
        })?;

    // Get subscription details
    let subscription_data = sqlx::query!(
        "SELECT id, tier_id FROM subscriptions WHERE stripe_subscription_id = $1",
        stripe_subscription_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    if let Some(sub) = subscription_data {
        // Update subscription status
        sqlx::query!(
            "UPDATE subscriptions SET status = 'CANCELLED', end_date = $1, cancelled_at = $2, updated_at = $3 WHERE id = $4",
            chrono::Utc::now(),
            chrono::Utc::now(),
            chrono::Utc::now(),
            sub.id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to update subscription"
                })),
            )
        })?;

        // Decrement tier subscriber count
        sqlx::query!(
            "UPDATE membership_tiers SET current_subscribers = current_subscribers - 1 WHERE id = $1",
            sub.tier_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to update tier subscriber count"
                })),
            )
        })?;

        tracing::info!("Subscription cancelled: {}", sub.id);
    }

    Ok(())
}

async fn handle_invoice_payment_succeeded(
    state: &AppState,
    data: &Value,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let invoice = data.get("object").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid webhook data"
            })),
        )
    })?;

    let stripe_subscription_id = invoice
        .get("subscription")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing subscription ID"
                })),
            )
        })?;

    // Get subscription and tier details
    let subscription_data = sqlx::query!(
        "SELECT s.id, mt.interval FROM subscriptions s 
         JOIN membership_tiers mt ON s.tier_id = mt.id 
         WHERE s.stripe_subscription_id = $1",
        stripe_subscription_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    if let Some(sub) = subscription_data {
        // Calculate next billing date
        let next_billing_date = if sub.interval == "MONTHLY" {
            chrono::Utc::now() + chrono::Duration::days(30)
        } else {
            chrono::Utc::now() + chrono::Duration::days(365)
        };

        // Update subscription
        sqlx::query!(
            "UPDATE subscriptions SET next_billing_date = $1, status = 'ACTIVE', updated_at = $2 WHERE id = $3",
            next_billing_date,
            chrono::Utc::now(),
            sub.id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to update subscription"
                })),
            )
        })?;

        tracing::info!("Payment processed for subscription: {}", sub.id);
    }

    Ok(())
}

async fn handle_invoice_payment_failed(
    state: &AppState,
    data: &Value,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let invoice = data.get("object").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid webhook data"
            })),
        )
    })?;

    let stripe_subscription_id = invoice
        .get("subscription")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing subscription ID"
                })),
            )
        })?;

    // Get subscription
    let subscription_data = sqlx::query!(
        "SELECT id FROM subscriptions WHERE stripe_subscription_id = $1",
        stripe_subscription_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    if let Some(sub) = subscription_data {
        tracing::info!("Payment failed for subscription: {}", sub.id);
        // TODO: Implement retry logic or grace period
        // TODO: Send payment failure email
    }

    Ok(())
}
