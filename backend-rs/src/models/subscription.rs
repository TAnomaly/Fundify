use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "SubscriptionStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(
    type_name = "SubscriptionInterval",
    rename_all = "SCREAMING_SNAKE_CASE"
)]
pub enum SubscriptionInterval {
    Monthly,
    Yearly,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Subscription {
    pub id: String,
    pub status: SubscriptionStatus,

    #[serde(rename = "startDate")]
    pub start_date: DateTime<Utc>,
    #[serde(rename = "nextBillingDate")]
    pub next_billing_date: DateTime<Utc>,
    #[serde(rename = "endDate")]
    pub end_date: Option<DateTime<Utc>>,
    #[serde(rename = "cancelledAt")]
    pub cancelled_at: Option<DateTime<Utc>>,

    #[serde(rename = "stripeSubscriptionId")]
    pub stripe_subscription_id: Option<String>,
    #[serde(rename = "stripeCustomerId")]
    pub stripe_customer_id: Option<String>,

    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,

    #[serde(rename = "subscriberId")]
    pub subscriber_id: String,
    #[serde(rename = "creatorId")]
    pub creator_id: String,
    #[serde(rename = "tierId")]
    pub tier_id: String,
}
