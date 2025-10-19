use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReferralCode {
    pub id: Uuid,
    pub code: String,
    pub description: Option<String>,
    pub usage_limit: Option<i32>,
    pub usage_count: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub reward_type: String,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateReferralCodeRequest {
    pub code: Option<String>,
    pub description: Option<String>,
    pub usage_limit: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub reward_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateReferralCodeRequest {
    pub description: Option<String>,
    pub usage_limit: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
    pub reward_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReferralCodeWithCount {
    pub id: Uuid,
    pub code: String,
    pub description: Option<String>,
    pub usage_limit: Option<i32>,
    pub usage_count: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub reward_type: String,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub usage_count_total: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReferralCodeWithCreator {
    pub id: Uuid,
    pub code: String,
    pub description: Option<String>,
    pub usage_limit: Option<i32>,
    pub usage_count: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub reward_type: String,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: Option<CreatorInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatorInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateReferralCodeResponse {
    pub code: String,
    pub description: Option<String>,
    pub reward_type: String,
    pub usage_limit: Option<i32>,
    pub usage_count: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub creator: Option<CreatorInfo>,
}
