use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionWithDetails {
    pub id: Uuid,
    pub subscriber_id: Uuid,
    pub creator_id: Uuid,
    pub tier_id: Uuid,
    pub status: String,
    pub start_date: DateTime<Utc>,
    pub next_billing_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tier: TierInfo,
    pub creator: CreatorInfo,
    pub subscriber: Option<SubscriberInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierInfo {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub interval: String,
    pub perks: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatorInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriberInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub tier_id: Uuid,
    pub creator_id: Uuid,
    pub referral_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionResponse {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<SubscriptionWithDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionsListResponse {
    pub success: bool,
    pub data: Vec<SubscriptionWithDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscribersResponse {
    pub success: bool,
    pub data: SubscribersData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscribersData {
    pub subscriptions: Vec<SubscriptionWithDetails>,
    pub stats: SubscriberStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriberStats {
    pub total_subscribers: i32,
    pub monthly_revenue: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentSubscriptionsQuery {
    pub creator_id: Uuid,
    pub limit: Option<i32>,
}
