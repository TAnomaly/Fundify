use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct EventSummary {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: String,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub price: Option<f64>,
    pub metadata: Option<Value>,
}
