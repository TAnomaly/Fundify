use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::Json as ResponseJson,
    routing::{get, patch, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

#[derive(Debug, Serialize)]
struct ReferralCodeResponse {
    id: Uuid,
    code: String,
    description: Option<String>,
    #[serde(rename = "rewardType")]
    reward_type: String,
    #[serde(rename = "usageLimit")]
    usage_limit: Option<i32>,
    #[serde(rename = "usageCount")]
    usage_count: i32,
    #[serde(rename = "expiresAt")]
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(rename = "isActive")]
    is_active: bool,
    #[serde(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
    #[serde(rename = "updatedAt")]
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateReferralCodeInput {
    code: Option<String>,
    description: Option<String>,
    usage_limit: Option<i32>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
    reward_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateReferralCodeInput {
    description: Option<String>,
    usage_limit: Option<i32>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
    is_active: Option<bool>,
    reward_type: Option<String>,
}

pub fn referral_routes() -> Router<Database> {
    Router::new()
        .route("/validate/:code", get(validate_code))
        .route("/", get(list_codes).post(create_code))
        .route("/:id", patch(update_code))
}

async fn list_codes(
    State(db): State<Database>,
    claims: Claims,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let codes = sqlx::query_as::<_, ReferralCodeResponse>(
        r#"
        SELECT 
            id,
            code,
            description,
            reward_type,
            usage_limit,
            usage_count,
            expires_at,
            is_active,
            created_at,
            updated_at
        FROM referral_codes
        WHERE creator_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(&claims.sub)
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(ResponseJson(json!({
        "success": true,
        "data": codes
    })))
}

async fn create_code(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<CreateReferralCodeInput>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let code = payload.code.unwrap_or_else(|| generate_referral_code());
    let reward_type = payload
        .reward_type
        .unwrap_or_else(|| "SUBSCRIPTION_CREDIT".to_string());

    let record = sqlx::query_as::<_, ReferralCodeResponse>(
        r#"
        INSERT INTO referral_codes (
            id, creator_id, code, description, reward_type, usage_limit, usage_count, expires_at, is_active, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, 0, $7, TRUE, NOW(), NOW()
        )
        RETURNING id, code, description, reward_type, usage_limit, usage_count, expires_at, is_active, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(&claims.sub)
    .bind(&code)
    .bind(&payload.description)
    .bind(reward_type)
    .bind(payload.usage_limit)
    .bind(payload.expires_at)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("referral_codes_code_key") => {
            StatusCode::CONFLICT
        }
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    Ok(ResponseJson(json!({
        "success": true,
        "data": record
    })))
}

async fn update_code(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(payload): Json<UpdateReferralCodeInput>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let record = sqlx::query_as::<_, ReferralCodeResponse>(
        r#"
        UPDATE referral_codes
        SET
            description = COALESCE($3, description),
            usage_limit = COALESCE($4, usage_limit),
            expires_at = COALESCE($5, expires_at),
            is_active = COALESCE($6, is_active),
            reward_type = COALESCE($7, reward_type),
            updated_at = NOW()
        WHERE id = $1 AND creator_id = $2
        RETURNING id, code, description, reward_type, usage_limit, usage_count, expires_at, is_active, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&claims.sub)
    .bind(&payload.description)
    .bind(payload.usage_limit)
    .bind(payload.expires_at)
    .bind(payload.is_active)
    .bind(payload.reward_type.clone())
    .fetch_one(&db.pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    Ok(ResponseJson(json!({
        "success": true,
        "data": record
    })))
}

async fn validate_code(
    State(db): State<Database>,
    Path(code): Path<String>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let record = sqlx::query(
        r#"
        SELECT 
            r.code,
            r.description,
            r.reward_type,
            r.usage_limit,
            r.usage_count,
            r.expires_at,
            r.is_active,
            u.id AS creator_id,
            u.name AS creator_name,
            u.avatar AS creator_avatar
        FROM referral_codes r
        JOIN users u ON r.creator_id = u.id
        WHERE LOWER(r.code) = LOWER($1)
        "#,
    )
    .bind(&code)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if !record.get::<bool, _>("is_active") {
        return Err(StatusCode::BAD_REQUEST);
    }

    if let Some(exp) = record.get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at") {
        if exp < chrono::Utc::now() {
            return Err(StatusCode::BAD_REQUEST);
        }
    }

    if let Some(limit) = record.get::<Option<i32>, _>("usage_limit") {
        if record.get::<i32, _>("usage_count") >= limit {
            return Err(StatusCode::BAD_REQUEST);
        }
    }

    Ok(ResponseJson(json!({
        "success": true,
        "data": {
            "code": record.get::<String, _>("code"),
            "description": record.get::<Option<String>, _>("description"),
            "rewardType": record.get::<String, _>("reward_type"),
            "usageLimit": record.get::<Option<i32>, _>("usage_limit"),
            "usageCount": record.get::<i32, _>("usage_count"),
            "expiresAt": record.get::<Option<chrono::DateTime<chrono::Utc>>, _>("expires_at"),
            "creator": {
                "id": record.get::<String, _>("creator_id"),
                "name": record.get::<Option<String>, _>("creator_name"),
                "avatar": record.get::<Option<String>, _>("creator_avatar"),
            }
        }
    })))
}

fn generate_referral_code() -> String {
    let mut raw = Uuid::new_v4()
        .to_string()
        .replace('-', "")
        .chars()
        .take(8)
        .collect::<String>()
        .to_uppercase();
    if raw.len() < 8 {
        raw.push_str("FUNDIFY");
        raw.truncate(8);
    }
    raw
}
