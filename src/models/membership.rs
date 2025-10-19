use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct MembershipTier {
    pub id: Uuid,
    pub campaign_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub price_cents: i32,
    pub interval: String,
    pub perks: Vec<String>,
    pub has_exclusive_content: bool,
    pub has_early_access: bool,
    pub has_priority_support: bool,
    pub custom_perks: Option<serde_json::Value>,
    pub max_subscribers: Option<i32>,
    pub current_subscribers: i32,
    pub position: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MembershipTierSummary {
    pub tier: MembershipTier,
    pub active_subscribers: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: Uuid,
    pub subscriber_id: Uuid,
    pub creator_id: Uuid,
    pub tier_id: Uuid,
    pub status: String,
    pub start_date: DateTime<Utc>,
    pub next_billing_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub stripe_subscription_id: Option<String>,
    pub stripe_customer_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionWithDetails {
    pub subscription: Subscription,
    pub tier: MembershipTier,
    pub creator: BasicUser,
    pub subscriber: BasicUser,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct BasicUser {
    pub id: Uuid,
    pub name: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Withdrawal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub amount_cents: i64,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub bank_account: Option<String>,
    pub created_at: DateTime<Utc>,
}
