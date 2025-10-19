use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use uuid::Uuid;

use crate::{
    models::membership_tier::{
        CreateMembershipTierRequest, MembershipTierResponse, MembershipTiersListResponse,
        UpdateMembershipTierRequest,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

pub fn membership_tiers_router() -> Router<AppState> {
    Router::new()
        .route("/campaigns/:campaign_id/tiers", post(create_membership_tier))
        .route("/campaigns/:campaign_id/tiers", get(get_campaign_tiers))
        .route("/tiers/:tier_id", put(update_membership_tier))
        .route("/tiers/:tier_id", delete(delete_membership_tier))
}

async fn create_membership_tier(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(campaign_id): Path<Uuid>,
    Json(payload): Json<CreateMembershipTierRequest>,
) -> Result<Json<MembershipTierResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Verify campaign ownership
    let campaign = sqlx::query!(
        "SELECT creator_id, campaign_type FROM campaigns WHERE id = $1",
        campaign_id
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

    if let Some(campaign) = campaign {
        if campaign.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to manage this campaign"
                })),
            ));
        }

        if campaign.campaign_type == "PROJECT" {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Membership tiers are only available for CREATOR campaigns"
                })),
            ));
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Campaign not found"
            })),
        ));
    }

    // Create the membership tier
    let tier_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO membership_tiers (id, name, description, price, interval, perks, has_exclusive_content, has_early_access, has_priority_support, custom_perks, max_subscribers, position, is_active, campaign_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14, $15)",
        tier_id,
        payload.name,
        payload.description,
        payload.price,
        payload.interval,
        &payload.perks,
        payload.has_exclusive_content.unwrap_or(false),
        payload.has_early_access.unwrap_or(false),
        payload.has_priority_support.unwrap_or(false),
        payload.custom_perks,
        payload.max_subscribers,
        payload.position.unwrap_or(0),
        campaign_id,
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
                "message": "Failed to create membership tier"
            })),
        )
    })?;

    // Fetch the created tier
    let tier = sqlx::query_as!(
        crate::models::membership_tier::MembershipTier,
        "SELECT * FROM membership_tiers WHERE id = $1",
        tier_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to fetch created tier"
            })),
        )
    })?;

    Ok(Json(MembershipTierResponse {
        success: true,
        message: None,
        data: Some(tier),
    }))
}

async fn get_campaign_tiers(
    State(state): State<AppState>,
    Path(campaign_id): Path<Uuid>,
) -> Result<Json<MembershipTiersListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let tiers = sqlx::query_as!(
        crate::models::membership_tier::MembershipTierWithCount,
        r#"
        SELECT 
            mt.*,
            COUNT(s.id) as subscription_count
        FROM membership_tiers mt
        LEFT JOIN subscriptions s ON mt.id = s.tier_id AND s.status = 'ACTIVE'
        WHERE mt.campaign_id = $1 AND mt.is_active = true
        GROUP BY mt.id
        ORDER BY mt.position ASC
        "#,
        campaign_id
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

    Ok(Json(MembershipTiersListResponse {
        success: true,
        data: tiers,
    }))
}

async fn update_membership_tier(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(tier_id): Path<Uuid>,
    Json(payload): Json<UpdateMembershipTierRequest>,
) -> Result<Json<MembershipTierResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Verify ownership
    let tier = sqlx::query!(
        "SELECT mt.id, c.creator_id FROM membership_tiers mt 
         JOIN campaigns c ON mt.campaign_id = c.id 
         WHERE mt.id = $1",
        tier_id
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
        if tier.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized"
                })),
            ));
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Tier not found"
            })),
        ));
    }

    // Build update query dynamically
    let mut update_fields = Vec::new();
    let mut bind_params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = vec![];
    let mut param_count = 1;

    if let Some(name) = &payload.name {
        update_fields.push(format!("name = ${}", param_count));
        bind_params.push(Box::new(name.clone()));
        param_count += 1;
    }

    if let Some(description) = &payload.description {
        update_fields.push(format!("description = ${}", param_count));
        bind_params.push(Box::new(description.clone()));
        param_count += 1;
    }

    if let Some(price) = payload.price {
        update_fields.push(format!("price = ${}", param_count));
        bind_params.push(Box::new(price));
        param_count += 1;
    }

    if let Some(perks) = &payload.perks {
        update_fields.push(format!("perks = ${}", param_count));
        bind_params.push(Box::new(perks.clone()));
        param_count += 1;
    }

    if let Some(has_exclusive_content) = payload.has_exclusive_content {
        update_fields.push(format!("has_exclusive_content = ${}", param_count));
        bind_params.push(Box::new(has_exclusive_content));
        param_count += 1;
    }

    if let Some(has_early_access) = payload.has_early_access {
        update_fields.push(format!("has_early_access = ${}", param_count));
        bind_params.push(Box::new(has_early_access));
        param_count += 1;
    }

    if let Some(has_priority_support) = payload.has_priority_support {
        update_fields.push(format!("has_priority_support = ${}", param_count));
        bind_params.push(Box::new(has_priority_support));
        param_count += 1;
    }

    if let Some(custom_perks) = &payload.custom_perks {
        update_fields.push(format!("custom_perks = ${}", param_count));
        bind_params.push(Box::new(custom_perks.clone()));
        param_count += 1;
    }

    if let Some(max_subscribers) = payload.max_subscribers {
        update_fields.push(format!("max_subscribers = ${}", param_count));
        bind_params.push(Box::new(max_subscribers));
        param_count += 1;
    }

    if let Some(position) = payload.position {
        update_fields.push(format!("position = ${}", param_count));
        bind_params.push(Box::new(position));
        param_count += 1;
    }

    if let Some(is_active) = payload.is_active {
        update_fields.push(format!("is_active = ${}", param_count));
        bind_params.push(Box::new(is_active));
        param_count += 1;
    }

    if update_fields.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "No fields to update"
            })),
        ));
    }

    update_fields.push(format!("updated_at = ${}", param_count));
    bind_params.push(Box::new(chrono::Utc::now()));
    param_count += 1;

    bind_params.push(Box::new(tier_id));

    let query = format!(
        "UPDATE membership_tiers SET {} WHERE id = ${}",
        update_fields.join(", "),
        param_count
    );

    // Execute the update
    sqlx::query(&query)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to update membership tier"
                })),
            )
        })?;

    // Fetch the updated tier
    let tier = sqlx::query_as!(
        crate::models::membership_tier::MembershipTier,
        "SELECT * FROM membership_tiers WHERE id = $1",
        tier_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({
            "success": false,
            "message": "Failed to fetch updated tier"
        })),
    )
    })?;

    Ok(Json(MembershipTierResponse {
        success: true,
        message: None,
        data: Some(tier),
    }))
}

async fn delete_membership_tier(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(tier_id): Path<Uuid>,
) -> Result<Json<MembershipTierResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Verify ownership and get subscription count
    let tier_info = sqlx::query!(
        "SELECT mt.id, c.creator_id, COUNT(s.id) as subscription_count 
         FROM membership_tiers mt 
         JOIN campaigns c ON mt.campaign_id = c.id 
         LEFT JOIN subscriptions s ON mt.id = s.tier_id AND s.status = 'ACTIVE'
         WHERE mt.id = $1
         GROUP BY mt.id, c.creator_id",
        tier_id
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

    if let Some(tier) = tier_info {
        if tier.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized"
                })),
            ));
        }

        // Soft delete if there are active subscriptions
        if tier.subscription_count.unwrap_or(0) > 0 {
            sqlx::query!(
                "UPDATE membership_tiers SET is_active = false, updated_at = $1 WHERE id = $2",
                chrono::Utc::now(),
                tier_id
            )
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to deactivate tier"
                    })),
                )
            })?;

            Ok(Json(MembershipTierResponse {
                success: true,
                message: Some("Tier deactivated. Active subscriptions will continue until cancelled.".to_string()),
                data: None,
            }))
        } else {
            sqlx::query!("DELETE FROM membership_tiers WHERE id = $1", tier_id)
                .execute(&state.pool)
                .await
                .map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({
                            "success": false,
                            "message": "Failed to delete tier"
                        })),
                    )
                })?;

            Ok(Json(MembershipTierResponse {
                success: true,
                message: Some("Tier deleted".to_string()),
                data: None,
            }))
        }
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
