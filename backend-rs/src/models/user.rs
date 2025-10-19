use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub banner_image: Option<String>,
    pub bio: Option<String>,
    pub creator_bio: Option<String>,
    pub role: String,
    pub is_creator: bool,
    pub social_links: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUser {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub banner_image: Option<String>,
    pub bio: Option<String>,
    pub creator_bio: Option<String>,
    pub role: String,
    pub is_creator: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub social_links: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<User> for PublicUser {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            banner_image: user.banner_image,
            bio: user.bio,
            creator_bio: user.creator_bio,
            role: user.role,
            is_creator: user.is_creator,
            social_links: user.social_links,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserStats {
    pub campaigns: i64,
    pub donations: i64,
    pub followers: i64,
    pub following: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeProfile {
    pub user: PublicUser,
    pub stats: UserStats,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUserProfile {
    pub user: PublicUserMinimal,
    pub campaigns_count: i64,
    pub donations_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUserMinimal {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct PublicUserProfileRow {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub created_at: DateTime<Utc>,
    pub campaigns_count: i64,
    pub donations_count: i64,
}

impl From<PublicUserProfileRow> for PublicUserProfile {
    fn from(row: PublicUserProfileRow) -> Self {
        Self {
            user: PublicUserMinimal {
                id: row.id,
                name: row.name,
                username: row.username,
                avatar: row.avatar,
                bio: row.bio,
                created_at: row.created_at,
            },
            campaigns_count: row.campaigns_count,
            donations_count: row.donations_count,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatorProfile {
    pub user: PublicUser,
    pub stats: UserStats,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatorListResponse {
    pub creators: Vec<CreatorSummary>,
}

#[derive(Debug, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CreatorSummary {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub creator_bio: Option<String>,
    pub is_creator: bool,
}
