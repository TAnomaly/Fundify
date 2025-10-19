use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Poll {
    pub id: Uuid,
    pub question: String,
    pub options: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub multiple_choice: bool,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub is_closed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollWithStats {
    pub id: Uuid,
    pub question: String,
    pub options: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub multiple_choice: bool,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub is_closed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub total_votes: i64,
    pub user_vote: Option<Vec<String>>,
    pub option_votes: Vec<OptionVote>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptionVote {
    pub option: String,
    pub votes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePollRequest {
    pub question: String,
    pub options: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub multiple_choice: Option<bool>,
    pub is_public: Option<bool>,
    pub minimum_tier_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteRequest {
    pub options: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollResponse {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<PollWithStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollsListResponse {
    pub success: bool,
    pub data: Vec<PollWithStats>,
}
