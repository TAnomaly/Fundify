use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WelcomeMessage {
    pub id: Uuid,
    pub subject: String,
    pub content: String,
    pub tier_id: Option<Uuid>,
    pub delay: i32,
    pub is_active: bool,
    pub sent_count: i32,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWelcomeMessageRequest {
    pub subject: String,
    pub content: String,
    pub tier_id: Option<Uuid>,
    pub delay: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateWelcomeMessageRequest {
    pub subject: Option<String>,
    pub content: Option<String>,
    pub tier_id: Option<Uuid>,
    pub delay: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WelcomeMessageWithRelations {
    pub id: Uuid,
    pub subject: String,
    pub content: String,
    pub tier_id: Option<Uuid>,
    pub delay: i32,
    pub is_active: bool,
    pub sent_count: i32,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: Option<CreatorInfo>,
    pub tier: Option<MembershipTierInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatorInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MembershipTierInfo {
    pub id: Uuid,
    pub name: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TriggerWelcomeMessageRequest {
    pub test_subscriber_id: Uuid,
}
