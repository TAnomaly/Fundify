use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Comment {
    pub id: Uuid,
    pub content: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CommentCreateRequest {
    pub content: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CommentUpdateRequest {
    pub content: String,
}
