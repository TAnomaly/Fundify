use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub is_creator: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Post {
    pub id: Uuid,
    pub user_id: String,
    pub title: String,
    pub content: Option<String>,
    pub media_url: Option<String>,
    pub media_type: Option<String>,
    pub is_premium: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Product {
    pub id: Uuid,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub currency: String,
    pub image_url: Option<String>,
    pub is_digital: bool,
    pub download_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Subscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub creator_id: Uuid,
    pub stripe_subscription_id: Option<String>,
    pub status: String,
    pub current_period_start: Option<DateTime<Utc>>,
    pub current_period_end: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Purchase {
    pub id: Uuid,
    pub user_id: Uuid,
    pub product_id: Uuid,
    pub stripe_payment_intent_id: Option<String>,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

// Request/Response DTOs
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub github_id: i64,
    pub username: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePostRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub media_url: Option<String>,
    pub media_type: Option<String>,
    #[serde(rename = "type")]
    pub content_type: Option<String>,
    pub images: Option<Vec<String>>,
    pub video_url: Option<String>,
    pub audio_url: Option<String>,
    pub is_public: Option<bool>,
    pub published: Option<bool>,
    pub published_at: Option<DateTime<Utc>>,
    pub is_premium: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProductRequest {
    #[serde(alias = "title")]
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub currency: Option<String>,
    #[serde(alias = "coverImage")]
    pub image_url: Option<String>,
    pub is_digital: Option<bool>,
    #[serde(alias = "fileUrl")]
    pub download_url: Option<String>,
    pub product_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: User,
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct GitHubUser {
    pub id: i64,
    pub login: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub avatar_url: String,
    pub bio: Option<String>,
}
