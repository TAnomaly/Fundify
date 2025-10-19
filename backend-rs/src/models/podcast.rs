use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct PodcastSummary {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub status: String,
    pub episode_count: Option<i64>,
    pub total_duration: Option<i64>,
    pub updated_at: Option<DateTime<Utc>>,
    pub metadata: Option<Value>,
}
