use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct CampaignSummary {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: String,
    pub category: String,
    pub image_url: String,
    pub current_amount: f64,
    pub goal: f64,
    pub end_date: Option<DateTime<Utc>>,
    pub backers: i64,
    pub featured: bool,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CreatorCampaign {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: String,
    pub story: String,
    pub category: String,
    pub campaign_type: String,
    pub status: String,
    pub cover_image: String,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub goal_amount: f64,
    pub current_amount: f64,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub metadata: Option<Value>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CampaignWithCreator {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: String,
    pub story: String,
    pub category: String,
    pub campaign_type: String,
    pub status: String,
    pub goal_amount: f64,
    pub current_amount: f64,
    pub currency: String,
    pub cover_image: String,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub creator_id: Uuid,
    pub creator_name: String,
    pub creator_avatar: Option<String>,
}
