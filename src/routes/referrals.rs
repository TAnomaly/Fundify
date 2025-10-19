use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::services::referral_service::{
    create_referral_code, list_referral_codes, update_referral_code, validate_referral_code,
    ReferralCodeCreateRequest, ReferralCodeResponse, ReferralCodeUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/referrals", get(handle_list_referral_codes).post(handle_create_referral_code))
        .route("/referrals/:id", patch(handle_update_referral_code))
        .route("/referrals/validate/:code", get(handle_validate_referral_code))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateReferralCodeRequest {
    #[validate(length(min = 3, max = 50))]
    code: String,
    #[validate(length(min = 3, max = 200))]
    description: String,
    #[validate(range(min = 0.0, max = 100.0))]
    discount_percentage: f64,
    #[validate(range(min = 1))]
    max_uses: u32,
    #[serde(default)]
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(default)]
    is_active: bool,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateReferralCodeRequest {
    #[validate(length(min = 3, max = 200))]
    description: Option<String>,
    #[validate(range(min = 0.0, max = 100.0))]
    discount_percentage: Option<f64>,
    #[validate(range(min = 1))]
    max_uses: Option<u32>,
    #[serde(default)]
    expires_at: Option<Option<chrono::DateTime<chrono::Utc>>>,
    #[serde(default)]
    is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct ReferralCodesQuery {
    page: Option<u32>,
    limit: Option<u32>,
    is_active: Option<bool>,
}

async fn handle_list_referral_codes(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<ReferralCodesQuery>,
) -> Result<Json<Vec<ReferralCodeResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let codes = list_referral_codes(&state, user_id, page, limit, query.is_active).await?;
    Ok(Json(codes))
}

async fn handle_create_referral_code(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateReferralCodeRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = ReferralCodeCreateRequest {
        code: body.code,
        description: body.description,
        discount_percentage: body.discount_percentage,
        max_uses: body.max_uses,
        expires_at: body.expires_at,
        is_active: body.is_active,
        creator_id: user_id,
    };

    let referral_code = create_referral_code(&state, input).await?;
    Ok((StatusCode::CREATED, Json(referral_code)))
}

async fn handle_update_referral_code(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateReferralCodeRequest>,
) -> Result<Json<ReferralCodeResponse>, AppError> {
    body.validate()?;

    let input = ReferralCodeUpdateRequest {
        description: body.description,
        discount_percentage: body.discount_percentage,
        max_uses: body.max_uses,
        expires_at: body.expires_at,
        is_active: body.is_active,
    };

    let referral_code = update_referral_code(&state, user_id, id, input).await?;
    Ok(Json(referral_code))
}

async fn handle_validate_referral_code(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(code): Path<String>,
) -> Result<Json<ReferralCodeResponse>, AppError> {
    let referral_code = validate_referral_code(&state, &code).await?;
    Ok(Json(referral_code))
}
