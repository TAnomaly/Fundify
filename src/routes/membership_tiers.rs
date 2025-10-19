use axum::{
    extract::{Path, State},
    routing::{post, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::membership::{MembershipTier, MembershipTierSummary};
use crate::services::membership_service::{
    create_membership_tier, delete_membership_tier, list_membership_tiers, update_membership_tier,
    MembershipTierInput, MembershipTierUpdateInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route(
            "/campaigns/:campaign_id/tiers",
            post(handle_create_tier).get(handle_list_tiers),
        )
        .route(
            "/tiers/:tier_id",
            put(handle_update_tier).delete(handle_delete_tier),
        )
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct MembershipTierRequest {
    #[validate(length(min = 3, max = 160))]
    name: String,
    #[serde(default)]
    #[validate(length(max = 5000))]
    description: Option<String>,
    #[validate(range(min = 100))]
    price_cents: i32,
    #[serde(default = "default_interval")]
    interval: String,
    #[serde(default)]
    perks: Vec<String>,
    #[serde(default)]
    has_exclusive_content: bool,
    #[serde(default)]
    has_early_access: bool,
    #[serde(default)]
    has_priority_support: bool,
    #[serde(default)]
    custom_perks: Option<serde_json::Value>,
    #[serde(default)]
    max_subscribers: Option<i32>,
    #[serde(default)]
    position: Option<i32>,
}

fn default_interval() -> String {
    "MONTHLY".to_string()
}

fn validate_interval(interval: Option<String>) -> Result<Option<String>, AppError> {
    match interval {
        Some(value) => {
            let normalized = value.to_ascii_uppercase();
            match normalized.as_str() {
                "MONTHLY" | "YEARLY" => Ok(Some(normalized)),
                _ => Err(invalid_interval_error()),
            }
        }
        None => Ok(None),
    }
}

fn invalid_interval_error() -> AppError {
    let mut errors = validator::ValidationErrors::new();
    let mut error = ValidationError::new("invalid_interval");
    error.message = Some("must be either MONTHLY or YEARLY".into());
    errors.add("interval", error);
    errors.into()
}

async fn handle_create_tier(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(campaign_id): Path<Uuid>,
    Json(body): Json<MembershipTierRequest>,
) -> Result<Json<MembershipTier>, AppError> {
    body.validate()?;

    let MembershipTierRequest {
        name,
        description,
        price_cents,
        interval,
        perks,
        has_exclusive_content,
        has_early_access,
        has_priority_support,
        custom_perks,
        max_subscribers,
        position,
    } = body;

    let interval = validate_interval(Some(interval))?.unwrap_or_else(default_interval);

    let input = MembershipTierInput {
        campaign_id,
        name,
        description,
        price_cents,
        interval,
        perks,
        has_exclusive_content,
        has_early_access,
        has_priority_support,
        custom_perks,
        max_subscribers,
        position,
    };

    let tier = create_membership_tier(&state, user_id, input).await?;
    Ok(Json(tier))
}

async fn handle_list_tiers(
    State(state): State<SharedState>,
    Path(campaign_id): Path<Uuid>,
) -> Result<Json<Vec<MembershipTierSummary>>, AppError> {
    let tiers = list_membership_tiers(&state, campaign_id).await?;
    Ok(Json(tiers))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct MembershipTierUpdateRequest {
    #[serde(default)]
    #[validate(length(min = 3, max = 160))]
    name: Option<String>,
    #[serde(default)]
    #[validate(length(max = 5000))]
    description: Option<String>,
    #[serde(default)]
    #[validate(range(min = 100))]
    price_cents: Option<i32>,
    #[serde(default)]
    interval: Option<String>,
    #[serde(default)]
    perks: Option<Vec<String>>,
    #[serde(default)]
    has_exclusive_content: Option<bool>,
    #[serde(default)]
    has_early_access: Option<bool>,
    #[serde(default)]
    has_priority_support: Option<bool>,
    #[serde(default)]
    custom_perks: Option<Option<serde_json::Value>>,
    #[serde(default)]
    max_subscribers: Option<Option<i32>>,
    #[serde(default)]
    position: Option<i32>,
    #[serde(default)]
    is_active: Option<bool>,
}

async fn handle_update_tier(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(tier_id): Path<Uuid>,
    Json(body): Json<MembershipTierUpdateRequest>,
) -> Result<Json<MembershipTier>, AppError> {
    body.validate()?;

    let MembershipTierUpdateRequest {
        name,
        description,
        price_cents,
        interval,
        perks,
        has_exclusive_content,
        has_early_access,
        has_priority_support,
        custom_perks,
        max_subscribers,
        position,
        is_active,
    } = body;

    let interval = validate_interval(interval)?;

    let input = MembershipTierUpdateInput {
        name,
        description,
        price_cents,
        interval,
        perks,
        has_exclusive_content,
        has_early_access,
        has_priority_support,
        custom_perks,
        max_subscribers,
        position,
        is_active,
    };

    let tier = update_membership_tier(&state, tier_id, user_id, input).await?;
    Ok(Json(tier))
}

async fn handle_delete_tier(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(tier_id): Path<Uuid>,
) -> Result<(), AppError> {
    delete_membership_tier(&state, tier_id, user_id).await
}
