use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct CreatorSummary {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub email: String,
    pub avatar: Option<String>,
    pub banner_image: Option<String>,
    pub creator_bio: Option<String>,
    pub subscriber_count: Option<i64>,
    pub post_count: Option<i64>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CreatorProfile {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub email: String,
    pub avatar: Option<String>,
    pub banner_image: Option<String>,
    pub creator_bio: Option<String>,
    pub social_links: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub follower_count: i64,
    pub following_count: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct MembershipTier {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub perks: Vec<String>,
    pub has_exclusive_content: bool,
    pub has_early_access: bool,
    pub has_priority_support: bool,
    pub custom_perks: Option<Value>,
    pub max_subscribers: Option<i32>,
    pub current_subscribers: i32,
    pub is_active: bool,
}
