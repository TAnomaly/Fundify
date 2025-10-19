use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct ArticleSummary {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub view_count: Option<i64>,
    pub read_time: Option<i32>,
    pub metadata: Option<Value>,
}
