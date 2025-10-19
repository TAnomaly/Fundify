use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::donation::Donation;
use crate::services::donation_service::{create_donation, DonationInput};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new().route("/donations", post(handle_create_donation))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateDonationRequest {
    campaign_id: Uuid,
    #[validate(range(min = 1.0))]
    amount: f64,
    #[serde(default)]
    #[validate(length(max = 500))]
    message: Option<String>,
    #[serde(default)]
    anonymous: bool,
    #[serde(default)]
    #[validate(length(max = 50))]
    payment_method: Option<String>,
    #[serde(default)]
    #[validate(length(max = 120))]
    transaction_id: Option<String>,
}

async fn handle_create_donation(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateDonationRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = DonationInput {
        campaign_id: body.campaign_id,
        amount: body.amount,
        message: sanitize_optional(body.message),
        anonymous: body.anonymous,
        payment_method: sanitize_optional(body.payment_method),
        transaction_id: sanitize_optional(body.transaction_id),
    };

    let donation: Donation = create_donation(&state, user_id, input).await?;
    Ok((StatusCode::CREATED, Json(donation)))
}

fn sanitize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}
