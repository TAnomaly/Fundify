use crate::error::AppError;
use crate::state::SharedState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct StripeWebhookResponse {
    pub received: bool,
    pub processed: bool,
    pub event_type: String,
}

pub async fn handle_stripe_webhook(
    state: &SharedState,
    event_type: String,
    data: serde_json::Value,
) -> Result<StripeWebhookResponse, AppError> {
    match event_type.as_str() {
        "checkout.session.completed" => {
            handle_checkout_session_completed(state, data).await?;
        }
        "customer.subscription.created" => {
            handle_subscription_created(state, data).await?;
        }
        "customer.subscription.updated" => {
            handle_subscription_updated(state, data).await?;
        }
        "customer.subscription.deleted" => {
            handle_subscription_deleted(state, data).await?;
        }
        "invoice.payment_succeeded" => {
            handle_payment_succeeded(state, data).await?;
        }
        "invoice.payment_failed" => {
            handle_payment_failed(state, data).await?;
        }
        _ => {
            // Log unhandled event type
            tracing::info!("Unhandled Stripe webhook event: {}", event_type);
        }
    }

    Ok(StripeWebhookResponse {
        received: true,
        processed: true,
        event_type,
    })
}

async fn handle_checkout_session_completed(
    state: &SharedState,
    data: serde_json::Value,
) -> Result<(), AppError> {
    // Extract session data
    let session = data.get("object").ok_or_else(|| {
        AppError::BadRequest("Invalid webhook data".to_string())
    })?;

    let customer_id = session.get("customer")
        .and_then(|c| c.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing customer ID".to_string()))?;

    let subscription_id = session.get("subscription")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing subscription ID".to_string()))?;

    // TODO: Update user subscription status
    tracing::info!("Checkout session completed for customer: {}", customer_id);
    tracing::info!("Subscription ID: {}", subscription_id);

    Ok(())
}

async fn handle_subscription_created(
    state: &SharedState,
    data: serde_json::Value,
) -> Result<(), AppError> {
    let subscription = data.get("object").ok_or_else(|| {
        AppError::BadRequest("Invalid webhook data".to_string())
    })?;

    let customer_id = subscription.get("customer")
        .and_then(|c| c.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing customer ID".to_string()))?;

    let subscription_id = subscription.get("id")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing subscription ID".to_string()))?;

    // TODO: Create subscription record
    tracing::info!("Subscription created for customer: {}", customer_id);
    tracing::info!("Subscription ID: {}", subscription_id);

    Ok(())
}

async fn handle_subscription_updated(
    state: &SharedState,
    data: serde_json::Value,
) -> Result<(), AppError> {
    let subscription = data.get("object").ok_or_else(|| {
        AppError::BadRequest("Invalid webhook data".to_string())
    })?;

    let subscription_id = subscription.get("id")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing subscription ID".to_string()))?;

    let status = subscription.get("status")
        .and_then(|s| s.as_str())
        .unwrap_or("unknown");

    // TODO: Update subscription status
    tracing::info!("Subscription updated: {} - Status: {}", subscription_id, status);

    Ok(())
}

async fn handle_subscription_deleted(
    state: &SharedState,
    data: serde_json::Value,
) -> Result<(), AppError> {
    let subscription = data.get("object").ok_or_else(|| {
        AppError::BadRequest("Invalid webhook data".to_string())
    })?;

    let subscription_id = subscription.get("id")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing subscription ID".to_string()))?;

    // TODO: Cancel subscription
    tracing::info!("Subscription deleted: {}", subscription_id);

    Ok(())
}

async fn handle_payment_succeeded(
    state: &SharedState,
    data: serde_json::Value,
) -> Result<(), AppError> {
    let invoice = data.get("object").ok_or_else(|| {
        AppError::BadRequest("Invalid webhook data".to_string())
    })?;

    let subscription_id = invoice.get("subscription")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing subscription ID".to_string()))?;

    // TODO: Process successful payment
    tracing::info!("Payment succeeded for subscription: {}", subscription_id);

    Ok(())
}

async fn handle_payment_failed(
    state: &SharedState,
    data: serde_json::Value,
) -> Result<(), AppError> {
    let invoice = data.get("object").ok_or_else(|| {
        AppError::BadRequest("Invalid webhook data".to_string())
    })?;

    let subscription_id = invoice.get("subscription")
        .and_then(|s| s.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing subscription ID".to_string()))?;

    // TODO: Handle failed payment
    tracing::info!("Payment failed for subscription: {}", subscription_id);

    Ok(())
}
