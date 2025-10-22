use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "UserRole", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UserRole {
    User,
    Admin,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    pub bio: Option<String>,
    pub role: UserRole,
    #[serde(rename = "emailVerified")]
    pub email_verified: bool,
    #[serde(rename = "githubId")]
    pub github_id: Option<String>,

    #[serde(rename = "isCreator")]
    pub is_creator: bool,
    #[serde(rename = "creatorBio")]
    pub creator_bio: Option<String>,
    #[serde(rename = "socialLinks")]
    pub social_links: Option<serde_json::Value>,

    #[serde(rename = "stripeCustomerId")]
    pub stripe_customer_id: Option<String>,
    #[serde(rename = "stripeAccountId")]
    pub stripe_account_id: Option<String>,
    #[serde(rename = "stripeOnboardingComplete")]
    pub stripe_onboarding_complete: bool,

    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub bio: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: UserPublic,
    pub token: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserPublic {
    pub id: String,
    pub email: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    pub bio: Option<String>,
    pub role: String, // Temporarily use String instead of UserRole
    #[serde(rename = "isCreator")]
    pub is_creator: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String, // Temporarily use String instead of DateTime<Utc>
}
