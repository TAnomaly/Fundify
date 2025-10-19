use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Withdrawal {
    pub id: Uuid,
    pub amount: f64,
    pub bank_account: String,
    pub notes: Option<String>,
    pub status: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub requested_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalWithCampaign {
    pub id: Uuid,
    pub amount: f64,
    pub bank_account: String,
    pub notes: Option<String>,
    pub status: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub requested_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub campaign: CampaignInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalWithUserAndCampaign {
    pub id: Uuid,
    pub amount: f64,
    pub bank_account: String,
    pub notes: Option<String>,
    pub status: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub requested_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub user: UserInfo,
    pub campaign: CampaignInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignInfo {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub name: String,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWithdrawalRequest {
    pub campaign_id: Uuid,
    pub amount: f64,
    pub bank_account: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWithdrawalRequest {
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<WithdrawalWithCampaign>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalsListResponse {
    pub success: bool,
    pub data: Vec<WithdrawalWithCampaign>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalsWithUserListResponse {
    pub success: bool,
    pub data: Vec<WithdrawalWithUserAndCampaign>,
}
