use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Comment {
    pub id: Uuid,
    pub content: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentWithUser {
    pub id: Uuid,
    pub content: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub user: CommentUser,
    pub replies: Vec<CommentWithUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentUser {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCommentRequest {
    pub campaign_id: Uuid,
    pub content: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCommentRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<CommentWithUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentsListResponse {
    pub success: bool,
    pub data: Vec<CommentWithUser>,
}
