use crate::error::AppError;
use crate::state::SharedState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CheckoutSessionRequest {
    pub tier_id: Uuid,
    pub success_url: String,
    pub cancel_url: String,
    pub user_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct PortalSessionRequest {
    pub return_url: String,
    pub user_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct StripeConfigResponse {
    pub publishable_key: String,
}

#[derive(Debug, Serialize)]
pub struct CheckoutSessionResponse {
    pub session_id: String,
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct PortalSessionResponse {
    pub url: String,
}

pub async fn get_stripe_config(
    state: &SharedState,
) -> Result<StripeConfigResponse, AppError> {
    // Get Stripe publishable key from environment
    let publishable_key = std::env::var("STRIPE_PUBLISHABLE_KEY")
        .unwrap_or_else(|_| "pk_test_...".to_string());

    Ok(StripeConfigResponse {
        publishable_key,
    })
}

pub async fn create_checkout_session(
    state: &SharedState,
    input: CheckoutSessionRequest,
) -> Result<CheckoutSessionResponse, AppError> {
    // Get tier information
    let tier = sqlx::query!(
        "SELECT name, price, currency FROM membership_tiers WHERE id = $1",
        input.tier_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let tier = match tier {
        Some(t) => t,
        None => return Err(AppError::NotFound("Membership tier not found".to_string())),
    };

    // Get user information
    let user = sqlx::query!(
        "SELECT email FROM users WHERE id = $1",
        input.user_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::NotFound("User not found".to_string())),
    };

    // TODO: Implement actual Stripe checkout session creation
    // For now, return mock data
    Ok(CheckoutSessionResponse {
        session_id: format!("cs_test_{}", Uuid::new_v4()),
        url: format!("https://checkout.stripe.com/pay/cs_test_{}", Uuid::new_v4()),
    })
}

pub async fn create_portal_session(
    state: &SharedState,
    input: PortalSessionRequest,
) -> Result<PortalSessionResponse, AppError> {
    // Get user information
    let user = sqlx::query!(
        "SELECT email FROM users WHERE id = $1",
        input.user_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let user = match user {
        Some(u) => u,
        None => return Err(AppError::NotFound("User not found".to_string())),
    };

    // TODO: Implement actual Stripe portal session creation
    // For now, return mock data
    Ok(PortalSessionResponse {
        url: format!("https://billing.stripe.com/p/login/test_{}", Uuid::new_v4()),
    })
}
