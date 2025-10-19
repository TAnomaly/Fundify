use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub attachments: Vec<String>,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub author_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPost {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Option<Vec<String>>,
    pub video_url: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub is_public: Option<bool>,
    pub minimum_tier_id: Option<Uuid>,
    pub published: Option<bool>,
    pub published_at: Option<DateTime<Utc>>,
}

