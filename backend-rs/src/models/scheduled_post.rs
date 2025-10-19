use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ScheduledPost {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub media_urls: Vec<String>,
    pub scheduled_for: DateTime<Utc>,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateScheduledPostRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub scheduled_for: DateTime<Utc>,
    pub is_public: Option<bool>,
    pub minimum_tier_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateScheduledPostRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub media_urls: Option<Vec<String>>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub is_public: Option<bool>,
    pub minimum_tier_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduledPostWithRelations {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub media_urls: Vec<String>,
    pub scheduled_for: DateTime<Utc>,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: Option<CreatorInfo>,
    pub minimum_tier: Option<MembershipTierInfo>,
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
pub struct PublishScheduledPostsResponse {
    pub published_count: i32,
    pub posts: Vec<serde_json::Value>,
}
