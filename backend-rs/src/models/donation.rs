use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "DonationStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DonationStatus {
    Pending,
    Completed,
    Failed,
    Refunded,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Donation {
    pub id: Uuid,
    pub amount: BigDecimal,
    pub message: Option<String>,
    pub anonymous: bool,
    pub status: DonationStatus,

    #[serde(rename = "paymentMethod")]
    pub payment_method: Option<String>,
    #[serde(rename = "transactionId")]
    pub transaction_id: Option<String>,

    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,

    #[serde(rename = "donorId")]
    pub donor_id: Uuid,
    #[serde(rename = "campaignId")]
    pub campaign_id: Uuid,
    #[serde(rename = "rewardId")]
    pub reward_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDonationRequest {
    #[serde(rename = "campaignId")]
    pub campaign_id: Uuid,
    pub amount: f64,
    pub message: Option<String>,
    pub anonymous: Option<bool>,
    #[serde(rename = "rewardId")]
    pub reward_id: Option<Uuid>,
}