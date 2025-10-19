use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, patch, post},
    Router,
};

use crate::{
    auth::AuthUser,
    error::AppError,
    models::{
        referral::{
            CreateReferralCodeRequest, ReferralCodeWithCount, ReferralCodeWithCreator,
            UpdateReferralCodeRequest, ValidateReferralCodeResponse,
        },
    },
    state::AppState,
};

pub fn referrals_router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_referral_codes))
        .route("/", post(create_referral_code))
        .route("/:id", patch(update_referral_code))
        .route("/validate/:code", get(validate_referral_code))
}

// GET /api/referrals - List referral codes for creator
pub async fn list_referral_codes(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Verify user is a creator
    let user = sqlx::query!(
        "SELECT is_creator FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let user = user.ok_or(AppError::NotFound("User not found".to_string()))?;
    if !user.is_creator {
        return Err(AppError::Forbidden("Only creators can view referral codes".to_string()));
    }

    let referral_codes = sqlx::query_as!(
        ReferralCodeWithCount,
        r#"
        SELECT 
            rc.id, rc.code, rc.description, rc.usage_limit, rc.usage_count, 
            rc.expires_at, rc.is_active, rc.reward_type, rc.creator_id, 
            rc.created_at, rc.updated_at,
            COUNT(ru.id) as usage_count_total
        FROM referral_codes rc
        LEFT JOIN referral_usages ru ON rc.id = ru.referral_code_id
        WHERE rc.creator_id = $1
        GROUP BY rc.id
        ORDER BY rc.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": referral_codes
    })))
}

// POST /api/referrals - Create referral code
pub async fn create_referral_code(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateReferralCodeRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Verify user is a creator
    let user = sqlx::query!(
        "SELECT is_creator FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let user = user.ok_or(AppError::NotFound("User not found".to_string()))?;
    if !user.is_creator {
        return Err(AppError::Forbidden("Only creators can create referral codes".to_string()));
    }

    // Validate code format if provided
    if let Some(code) = &payload.code {
        let normalized_code = code.trim().to_uppercase();
        if !normalized_code.chars().all(|c| c.is_alphanumeric() || c == '-') || 
           normalized_code.len() < 4 || normalized_code.len() > 20 {
            return Err(AppError::BadRequest(
                "Referral code must be 4-20 characters using A-Z, 0-9, or hyphen".to_string(),
            ));
        }

        // Check if code already exists
        let existing = sqlx::query!(
            "SELECT id FROM referral_codes WHERE code = $1",
            normalized_code
        )
        .fetch_optional(&state.pool)
        .await?;

        if existing.is_some() {
            return Err(AppError::BadRequest("Referral code already exists".to_string()));
        }
    }

    // Generate code if not provided
    let final_code = if let Some(code) = &payload.code {
        code.trim().to_uppercase()
    } else {
        // Generate a random code
        let mut attempts = 0;
        let mut generated_code = String::new();
        
        while attempts < 5 {
            generated_code = format!("REF{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
            
            let existing = sqlx::query!(
                "SELECT id FROM referral_codes WHERE code = $1",
                &generated_code
            )
            .fetch_optional(&state.pool)
            .await?;

            if existing.is_none() {
                break;
            }
            
            attempts += 1;
        }

        if attempts >= 5 {
            return Err(AppError::InternalServerError("Unable to generate unique referral code".to_string()));
        }

        generated_code
    };

    // Validate usage limit
    if let Some(limit) = payload.usage_limit {
        if limit <= 0 {
            return Err(AppError::BadRequest("Usage limit must be a positive number".to_string()));
        }
    }

    // Validate expiration date
    if let Some(expires_at) = payload.expires_at {
        if expires_at <= chrono::Utc::now() {
            return Err(AppError::BadRequest("Expiration date must be in the future".to_string()));
        }
    }

    let referral_code = sqlx::query_as!(
        ReferralCodeWithCount,
        r#"
        INSERT INTO referral_codes (
            id, code, description, usage_limit, usage_count, expires_at, 
            is_active, reward_type, creator_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING 
            id, code, description, usage_limit, usage_count, expires_at, 
            is_active, reward_type, creator_id, created_at, updated_at,
            0 as usage_count_total
        "#,
        uuid::Uuid::new_v4(),
        final_code,
        payload.description,
        payload.usage_limit,
        0, // usage_count starts at 0
        payload.expires_at,
        true, // is_active starts as true
        payload.reward_type.unwrap_or_else(|| "SUBSCRIPTION_CREDIT".to_string()),
        user_id,
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": referral_code
    })))
}

// PATCH /api/referrals/:id - Update referral code
pub async fn update_referral_code(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<UpdateReferralCodeRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Verify user is a creator
    let user = sqlx::query!(
        "SELECT is_creator FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let user = user.ok_or(AppError::NotFound("User not found".to_string()))?;
    if !user.is_creator {
        return Err(AppError::Forbidden("Only creators can update referral codes".to_string()));
    }

    // Check if referral code exists and user owns it
    let existing_referral = sqlx::query!(
        "SELECT id, usage_count, usage_limit FROM referral_codes WHERE id = $1 AND creator_id = $2",
        id,
        user_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_referral = existing_referral.ok_or(AppError::NotFound("Referral code not found".to_string()))?;

    // Validate usage limit
    if let Some(limit) = payload.usage_limit {
        if limit <= 0 {
            return Err(AppError::BadRequest("Usage limit must be a positive number".to_string()));
        }
        if limit < existing_referral.usage_count {
            return Err(AppError::BadRequest("Usage limit cannot be less than current usage count".to_string()));
        }
    }

    // Validate expiration date
    if let Some(expires_at) = payload.expires_at {
        if expires_at <= chrono::Utc::now() {
            return Err(AppError::BadRequest("Expiration date must be in the future".to_string()));
        }
    }

    // Build update query dynamically
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![];
    let mut param_count = 0;

    if let Some(description) = payload.description {
        param_count += 1;
        update_fields.push(format!("description = ${}", param_count));
        params.push(Box::new(description));
    }
    if let Some(usage_limit) = payload.usage_limit {
        param_count += 1;
        update_fields.push(format!("usage_limit = ${}", param_count));
        params.push(Box::new(usage_limit));
    }
    if let Some(expires_at) = payload.expires_at {
        param_count += 1;
        update_fields.push(format!("expires_at = ${}", param_count));
        params.push(Box::new(expires_at));
    }
    if let Some(is_active) = payload.is_active {
        param_count += 1;
        update_fields.push(format!("is_active = ${}", param_count));
        params.push(Box::new(is_active));
    }
    if let Some(reward_type) = payload.reward_type {
        param_count += 1;
        update_fields.push(format!("reward_type = ${}", param_count));
        params.push(Box::new(reward_type));
    }

    if update_fields.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    param_count += 1;
    update_fields.push(format!("updated_at = ${}", param_count));
    params.push(Box::new(chrono::Utc::now()));

    param_count += 1;
    params.push(Box::new(id));

    let query = format!(
        "UPDATE referral_codes SET {} WHERE id = ${}",
        update_fields.join(", "),
        param_count
    );

    sqlx::query(&query)
        .bind(&*params[0])
        .execute(&state.pool)
        .await?;

    // Fetch updated referral code
    let updated_referral = sqlx::query_as!(
        ReferralCodeWithCount,
        r#"
        SELECT 
            rc.id, rc.code, rc.description, rc.usage_limit, rc.usage_count, 
            rc.expires_at, rc.is_active, rc.reward_type, rc.creator_id, 
            rc.created_at, rc.updated_at,
            COUNT(ru.id) as usage_count_total
        FROM referral_codes rc
        LEFT JOIN referral_usages ru ON rc.id = ru.referral_code_id
        WHERE rc.id = $1
        GROUP BY rc.id
        "#,
        id
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": updated_referral
    })))
}

// GET /api/referrals/validate/:code - Validate referral code
pub async fn validate_referral_code(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    if code.trim().is_empty() {
        return Err(AppError::BadRequest("Referral code is required".to_string()));
    }

    let normalized_code = code.trim().to_uppercase();

    let referral = sqlx::query_as!(
        ReferralCodeWithCreator,
        r#"
        SELECT 
            rc.id, rc.code, rc.description, rc.usage_limit, rc.usage_count, 
            rc.expires_at, rc.is_active, rc.reward_type, rc.creator_id, 
            rc.created_at, rc.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar
        FROM referral_codes rc
        LEFT JOIN users u ON rc.creator_id = u.id
        WHERE rc.code = $1
        "#,
        normalized_code
    )
    .fetch_optional(&state.pool)
    .await?;

    let referral = referral.ok_or(AppError::NotFound("Referral code not found".to_string()))?;

    if !referral.is_active {
        return Err(AppError::BadRequest("Referral code is not active".to_string()));
    }

    if let Some(expires_at) = referral.expires_at {
        if expires_at <= chrono::Utc::now() {
            return Err(AppError::BadRequest("Referral code has expired".to_string()));
        }
    }

    if let Some(usage_limit) = referral.usage_limit {
        if referral.usage_count >= usage_limit {
            return Err(AppError::BadRequest("Referral code usage limit reached".to_string()));
        }
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "code": referral.code,
            "description": referral.description,
            "reward_type": referral.reward_type,
            "usage_limit": referral.usage_limit,
            "usage_count": referral.usage_count,
            "expires_at": referral.expires_at,
            "creator": referral.creator
        }
    })))
}
