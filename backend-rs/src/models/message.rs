use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub receiver_id: Option<Uuid>,
    pub content: String,
    pub message_type: String,
    pub attachment_url: Option<String>,
    pub attachment_name: Option<String>,
    pub is_broadcast: bool,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageWithUsers {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub receiver_id: Option<Uuid>,
    pub content: String,
    pub message_type: String,
    pub attachment_url: Option<String>,
    pub attachment_name: Option<String>,
    pub is_broadcast: bool,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub sender: UserInfo,
    pub receiver: Option<UserInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageRequest {
    pub receiver_id: Option<Uuid>,
    pub content: String,
    pub message_type: Option<String>,
    pub attachment_url: Option<String>,
    pub attachment_name: Option<String>,
    pub is_broadcast: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<MessageWithUsers>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagesListResponse {
    pub success: bool,
    pub data: Vec<MessageWithUsers>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationsListResponse {
    pub success: bool,
    pub data: Vec<Conversation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub other_user: UserInfo,
    pub last_message: Option<MessageWithUsers>,
    pub unread_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnreadCountResponse {
    pub success: bool,
    pub data: UnreadCount,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnreadCount {
    pub count: i64,
}
