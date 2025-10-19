use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DigitalProduct {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub price: f64,
    pub product_type: String,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub cover_image: Option<String>,
    pub preview_url: Option<String>,
    pub features: Vec<String>,
    pub requirements: Vec<String>,
    pub is_active: bool,
    pub is_featured: bool,
    pub sales_count: i32,
    pub revenue: f64,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDigitalProductRequest {
    pub title: String,
    pub description: Option<String>,
    pub price: Option<f64>,
    pub product_type: String,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub cover_image: Option<String>,
    pub preview_url: Option<String>,
    pub features: Option<Vec<String>>,
    pub requirements: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDigitalProductRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub price: Option<f64>,
    pub product_type: Option<String>,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub cover_image: Option<String>,
    pub preview_url: Option<String>,
    pub features: Option<Vec<String>>,
    pub requirements: Option<Vec<String>>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DigitalProductWithRelations {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub price: f64,
    pub product_type: String,
    pub file_url: Option<String>,
    pub file_size: Option<String>, // Converted to string for JSON
    pub cover_image: Option<String>,
    pub preview_url: Option<String>,
    pub features: Vec<String>,
    pub requirements: Vec<String>,
    pub is_active: bool,
    pub is_featured: bool,
    pub sales_count: i32,
    pub revenue: f64,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: Option<CreatorInfo>,
    pub purchase_count: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatorInfo {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub is_creator: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Purchase {
    pub id: Uuid,
    pub user_id: Uuid,
    pub product_id: Uuid,
    pub amount: f64,
    pub status: String,
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
    pub download_count: i32,
    pub last_download_at: Option<DateTime<Utc>>,
    pub purchased_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseWithProduct {
    pub id: Uuid,
    pub user_id: Uuid,
    pub product_id: Uuid,
    pub amount: f64,
    pub status: String,
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
    pub download_count: i32,
    pub last_download_at: Option<DateTime<Utc>>,
    pub purchased_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub product: Option<DigitalProductWithRelations>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseProductRequest {
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductMetaResponse {
    pub types: Vec<ProductTypeCount>,
    pub price_range: PriceRange,
    pub stats: ProductStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductTypeCount {
    pub r#type: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceRange {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductStats {
    pub total_products: i64,
    pub featured_count: i64,
    pub creator_count: i64,
    pub total_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductCollectionsResponse {
    pub featured: Vec<DigitalProductWithRelations>,
    pub top_selling: Vec<DigitalProductWithRelations>,
    pub new_arrivals: Vec<DigitalProductWithRelations>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProductResponse {
    pub file_url: String,
    pub file_name: String,
    pub file_size: Option<String>,
}
