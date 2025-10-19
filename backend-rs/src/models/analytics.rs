use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct GlobalAnalytics {
    pub total_users: i64,
    pub total_creators: i64,
    pub total_campaigns: i64,
    pub total_donations_volume: f64,
    pub total_posts: i64,
    pub total_subscriptions: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CreatorAnalytics {
    pub creator_id: Uuid,
    pub total_subscribers: i64,
    pub total_donations_volume: f64,
    pub total_posts: i64,
}
