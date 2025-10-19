use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ReferralCodeCreateRequest {
    pub code: String,
    pub description: String,
    pub discount_percentage: f64,
    pub max_uses: u32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub creator_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ReferralCodeUpdateRequest {
    pub description: Option<String>,
    pub discount_percentage: Option<f64>,
    pub max_uses: Option<u32>,
    pub expires_at: Option<Option<DateTime<Utc>>>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ReferralCodeResponse {
    pub id: Uuid,
    pub code: String,
    pub description: String,
    pub discount_percentage: f64,
    pub max_uses: u32,
    pub current_uses: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn create_referral_code(
    state: &SharedState,
    input: ReferralCodeCreateRequest,
) -> Result<ReferralCodeResponse, AppError> {
    let referral_id = Uuid::new_v4();
    
    let referral = sqlx::query!(
        r#"
        INSERT INTO referral_codes (
            id, code, description, discount_percentage, max_uses, current_uses,
            expires_at, is_active, creator_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, NOW(), NOW())
        RETURNING *
        "#,
        referral_id,
        input.code,
        input.description,
        input.discount_percentage,
        input.max_uses as i32,
        input.expires_at,
        input.is_active,
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(ReferralCodeResponse {
        id: referral.id,
        code: referral.code,
        description: referral.description,
        discount_percentage: referral.discount_percentage,
        max_uses: referral.max_uses as u32,
        current_uses: referral.current_uses,
        expires_at: referral.expires_at,
        is_active: referral.is_active,
        creator_id: referral.creator_id,
        created_at: referral.created_at,
        updated_at: referral.updated_at,
    })
}

pub async fn list_referral_codes(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    is_active: Option<bool>,
) -> Result<Vec<ReferralCodeResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "creator_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(active) = is_active {
        where_clause.push_str(&format!(" AND is_active = ${}", param_count + 1));
        params.push(Box::new(active));
        param_count += 1;
    }

    let query_str = format!(
        r#"
        SELECT * FROM referral_codes
        WHERE {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(vec![])
}

pub async fn update_referral_code(
    state: &SharedState,
    user_id: Uuid,
    referral_id: Uuid,
    input: ReferralCodeUpdateRequest,
) -> Result<ReferralCodeResponse, AppError> {
    // Check if referral exists and user owns it
    let referral = sqlx::query!(
        "SELECT creator_id FROM referral_codes WHERE id = $1",
        referral_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let referral = match referral {
        Some(r) => r,
        None => return Err(AppError::NotFound("Referral code not found".to_string())),
    };

    if referral.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    // Build dynamic update query
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(description) = input.description {
        update_fields.push(format!("description = ${}", param_count));
        params.push(Box::new(description));
        param_count += 1;
    }

    if let Some(discount_percentage) = input.discount_percentage {
        update_fields.push(format!("discount_percentage = ${}", param_count));
        params.push(Box::new(discount_percentage));
        param_count += 1;
    }

    if let Some(max_uses) = input.max_uses {
        update_fields.push(format!("max_uses = ${}", param_count));
        params.push(Box::new(max_uses as i32));
        param_count += 1;
    }

    if let Some(expires_at) = input.expires_at {
        update_fields.push(format!("expires_at = ${}", param_count));
        params.push(Box::new(expires_at));
        param_count += 1;
    }

    if let Some(is_active) = input.is_active {
        update_fields.push(format!("is_active = ${}", param_count));
        params.push(Box::new(is_active));
        param_count += 1;
    }

    if update_fields.is_empty() {
        return get_referral_code_by_id(state, referral_id).await;
    }

    update_fields.push("updated_at = NOW()".to_string());
    update_fields.push(format!("id = ${}", param_count));
    params.push(Box::new(referral_id));

    // For now, return the existing referral (TODO: implement dynamic query)
    get_referral_code_by_id(state, referral_id).await
}

pub async fn validate_referral_code(
    state: &SharedState,
    code: &str,
) -> Result<ReferralCodeResponse, AppError> {
    let referral = sqlx::query!(
        r#"
        SELECT * FROM referral_codes
        WHERE code = $1 AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND current_uses < max_uses
        "#,
        code
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let referral = match referral {
        Some(r) => r,
        None => return Err(AppError::NotFound("Invalid or expired referral code".to_string())),
    };

    Ok(ReferralCodeResponse {
        id: referral.id,
        code: referral.code,
        description: referral.description,
        discount_percentage: referral.discount_percentage,
        max_uses: referral.max_uses as u32,
        current_uses: referral.current_uses,
        expires_at: referral.expires_at,
        is_active: referral.is_active,
        creator_id: referral.creator_id,
        created_at: referral.created_at,
        updated_at: referral.updated_at,
    })
}

async fn get_referral_code_by_id(
    state: &SharedState,
    referral_id: Uuid,
) -> Result<ReferralCodeResponse, AppError> {
    let referral = sqlx::query!(
        "SELECT * FROM referral_codes WHERE id = $1",
        referral_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let referral = match referral {
        Some(r) => r,
        None => return Err(AppError::NotFound("Referral code not found".to_string())),
    };

    Ok(ReferralCodeResponse {
        id: referral.id,
        code: referral.code,
        description: referral.description,
        discount_percentage: referral.discount_percentage,
        max_uses: referral.max_uses as u32,
        current_uses: referral.current_uses,
        expires_at: referral.expires_at,
        is_active: referral.is_active,
        creator_id: referral.creator_id,
        created_at: referral.created_at,
        updated_at: referral.updated_at,
    })
}
