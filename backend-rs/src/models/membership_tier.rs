use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MembershipTier {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub interval: String,
    pub perks: Vec<String>,
    pub has_exclusive_content: bool,
    pub has_early_access: bool,
    pub has_priority_support: bool,
    pub custom_perks: Option<serde_json::Value>,
    pub max_subscribers: Option<i32>,
    pub position: i32,
    pub is_active: bool,
    pub campaign_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MembershipTierWithCount {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub interval: String,
    pub perks: Vec<String>,
    pub has_exclusive_content: bool,
    pub has_early_access: bool,
    pub has_priority_support: bool,
    pub custom_perks: Option<serde_json::Value>,
    pub max_subscribers: Option<i32>,
    pub position: i32,
    pub is_active: bool,
    pub campaign_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub subscription_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMembershipTierRequest {
    pub name: String,
    pub description: String,
    pub price: f64,
    pub interval: String,
    pub perks: Vec<String>,
    pub has_exclusive_content: Option<bool>,
    pub has_early_access: Option<bool>,
    pub has_priority_support: Option<bool>,
    pub custom_perks: Option<serde_json::Value>,
    pub max_subscribers: Option<i32>,
    pub position: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMembershipTierRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub price: Option<f64>,
    pub perks: Option<Vec<String>>,
    pub has_exclusive_content: Option<bool>,
    pub has_early_access: Option<bool>,
    pub has_priority_support: Option<bool>,
    pub custom_perks: Option<serde_json::Value>,
    pub max_subscribers: Option<i32>,
    pub position: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MembershipTierResponse {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<MembershipTier>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MembershipTiersListResponse {
    pub success: bool,
    pub data: Vec<MembershipTierWithCount>,
}
