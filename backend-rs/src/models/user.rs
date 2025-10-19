use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow)]
pub struct UserWithPassword {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub password: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserPublic {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

impl From<UserWithPassword> for UserPublic {
    fn from(value: UserWithPassword) -> Self {
        Self {
            id: value.id,
            email: value.email,
            name: value.name,
            username: value.username,
            avatar: value.avatar,
            bio: value.bio,
            role: value.role,
            created_at: value.created_at,
        }
    }
}

#[derive(Debug, FromRow)]
pub struct UserGithubLink {
    pub id: Uuid,
    #[sqlx(rename = "githubId")]
    pub github_id: Option<String>,
}
