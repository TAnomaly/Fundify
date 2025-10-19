use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct DigitalProductSummary {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub price: f64,
    pub currency: String,
    pub is_active: bool,
    pub cover_image: Option<String>,
    pub download_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub metadata: Option<Value>,
}
