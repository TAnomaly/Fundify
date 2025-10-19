use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::stripe_service::{
    create_checkout_session, create_portal_session, get_stripe_config,
    CheckoutSessionRequest, PortalSessionRequest, StripeConfigResponse,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/stripe/config", get(handle_get_stripe_config))
        .route("/stripe/create-checkout-session", post(handle_create_checkout_session))
        .route("/stripe/create-portal-session", post(handle_create_portal_session))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateCheckoutSessionRequest {
    tier_id: Uuid,
    success_url: String,
    cancel_url: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreatePortalSessionRequest {
    return_url: String,
}

async fn handle_get_stripe_config(
    State(state): State<SharedState>,
) -> Result<Json<StripeConfigResponse>, AppError> {
    let config = get_stripe_config(&state).await?;
    Ok(Json(config))
}

async fn handle_create_checkout_session(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateCheckoutSessionRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = CheckoutSessionRequest {
        tier_id: body.tier_id,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        user_id,
    };

    let session = create_checkout_session(&state, input).await?;
    Ok((StatusCode::CREATED, Json(session)))
}

async fn handle_create_portal_session(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreatePortalSessionRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = PortalSessionRequest {
        return_url: body.return_url,
        user_id,
    };

    let session = create_portal_session(&state, input).await?;
    Ok((StatusCode::CREATED, Json(session)))
}
