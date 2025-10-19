use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Goal {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub goal_type: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub reward_description: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub is_public: bool,
    pub is_completed: bool,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalWithCreator {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub goal_type: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub reward_description: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub is_public: bool,
    pub is_completed: bool,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: CreatorInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatorInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGoalRequest {
    pub title: String,
    pub description: Option<String>,
    pub goal_type: Option<String>,
    pub target_amount: f64,
    pub reward_description: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateGoalRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub target_amount: Option<f64>,
    pub reward_description: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateGoalProgressRequest {
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalResponse {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<GoalWithCreator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalsListResponse {
    pub success: bool,
    pub data: Vec<GoalWithCreator>,
}
