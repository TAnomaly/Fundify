use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub link: Option<String>,
    pub image_url: Option<String>,
    pub is_read: bool,
    pub read_at: Option<DateTime<Utc>>,
    pub actor_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationWithActor {
    pub id: Uuid,
    pub user_id: Uuid,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub link: Option<String>,
    pub image_url: Option<String>,
    pub is_read: bool,
    pub read_at: Option<DateTime<Utc>>,
    pub actor_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub actor: Option<ActorInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActorInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub link: Option<String>,
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub items: Vec<NotificationWithActor>,
    pub unread_count: i64,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MarkAllReadResponse {
    pub updated: i64,
}
