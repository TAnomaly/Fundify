use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DigitalProduct {
    pub id: Uuid,
    pub creator_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub product_type: String,
    pub price_cents: i32,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub cover_image: Option<String>,
    pub preview_url: Option<String>,
    pub features: Vec<String>,
    pub requirements: Vec<String>,
    pub sales_count: i32,
    pub revenue_cents: i64,
    pub is_active: bool,
    pub is_featured: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DigitalProductListResponse {
    pub products: Vec<DigitalProduct>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Purchase {
    pub id: Uuid,
    pub product_id: Uuid,
    pub user_id: Uuid,
    pub amount_cents: i32,
    pub status: String,
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
    pub download_count: i32,
    pub last_download_at: Option<DateTime<Utc>>,
    pub purchased_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
