use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Donation {
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub donor_id: Uuid,
    pub amount: f64,
    pub message: Option<String>,
    pub anonymous: bool,
    pub status: String,
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct DonationRow {
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub donor_id: Uuid,
    pub amount: f64,
    pub message: Option<String>,
    pub anonymous: bool,
    pub status: String,
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<DonationRow> for Donation {
    fn from(row: DonationRow) -> Self {
        Self {
            id: row.id,
            campaign_id: row.campaign_id,
            donor_id: row.donor_id,
            amount: row.amount,
            message: row.message,
            anonymous: row.anonymous,
            status: row.status,
            payment_method: row.payment_method,
            transaction_id: row.transaction_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}
