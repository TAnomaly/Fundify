use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "CampaignStatus", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CampaignStatus {
    Draft,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "CampaignType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CampaignType {
    Project,
    Creator,
    Charity,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "CampaignCategory", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CampaignCategory {
    Technology,
    Creative,
    Community,
    Business,
    Education,
    Health,
    Environment,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Campaign {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub story: String,
    #[serde(rename = "type")]
    pub campaign_type: CampaignType,
    pub category: CampaignCategory,
    #[serde(rename = "goalAmount")]
    pub goal_amount: BigDecimal,
    #[serde(rename = "currentAmount")]
    pub current_amount: BigDecimal,
    pub currency: String,
    pub status: CampaignStatus,

    #[serde(rename = "coverImage")]
    pub cover_image: String,
    pub images: Vec<String>,
    #[serde(rename = "videoUrl")]
    pub video_url: Option<String>,

    #[serde(rename = "startDate")]
    pub start_date: Option<DateTime<Utc>>,
    #[serde(rename = "endDate")]
    pub end_date: Option<DateTime<Utc>>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,

    #[serde(rename = "creatorId")]
    pub creator_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCampaignRequest {
    pub title: String,
    pub description: String,
    pub story: String,
    #[serde(rename = "type")]
    pub campaign_type: Option<CampaignType>,
    pub category: CampaignCategory,
    #[serde(rename = "goalAmount")]
    pub goal_amount: f64,
    #[serde(rename = "coverImage")]
    pub cover_image: String,
    pub images: Option<Vec<String>>,
    #[serde(rename = "videoUrl")]
    pub video_url: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<DateTime<Utc>>,
    #[serde(rename = "endDate")]
    pub end_date: Option<DateTime<Utc>>,
}
