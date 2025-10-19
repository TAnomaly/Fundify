use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatorSummary {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub creator_bio: Option<String>,
    pub is_creator: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignSummary {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub goal_amount: f64,
    pub current_amount: f64,
    pub currency: String,
    pub status: String,
    pub campaign_type: String,
    pub cover_image: String,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub donation_total: f64,
    pub donation_count: i64,
    pub creator: CreatorSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignDetail {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub story: String,
    pub goal_amount: f64,
    pub current_amount: f64,
    pub currency: String,
    pub status: String,
    pub campaign_type: String,
    pub category: String,
    pub cover_image: String,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub donation_total: f64,
    pub donation_count: i64,
    pub creator: CreatorSummary,
}

#[derive(Debug, FromRow)]
pub struct CampaignSummaryRow {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub goal_amount: f64,
    pub current_amount: f64,
    pub currency: String,
    pub status: String,
    pub campaign_type: String,
    pub cover_image: String,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub donation_total: f64,
    pub donation_count: i64,
    pub creator_id: Uuid,
    pub creator_name: String,
    pub creator_username: Option<String>,
    pub creator_avatar: Option<String>,
    pub creator_creator_bio: Option<String>,
    pub creator_is_creator: bool,
}

impl From<CampaignSummaryRow> for CampaignSummary {
    fn from(row: CampaignSummaryRow) -> Self {
        Self {
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.description,
            goal_amount: row.goal_amount,
            current_amount: row.current_amount,
            currency: row.currency,
            status: row.status,
            campaign_type: row.campaign_type,
            cover_image: row.cover_image,
            start_date: row.start_date,
            end_date: row.end_date,
            created_at: row.created_at,
            updated_at: row.updated_at,
            donation_total: row.donation_total,
            donation_count: row.donation_count,
            creator: CreatorSummary {
                id: row.creator_id,
                name: row.creator_name,
                username: row.creator_username,
                avatar: row.creator_avatar,
                creator_bio: row.creator_creator_bio,
                is_creator: row.creator_is_creator,
            },
        }
    }
}

#[derive(Debug, FromRow)]
pub struct CampaignDetailRow {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub story: String,
    pub goal_amount: f64,
    pub current_amount: f64,
    pub currency: String,
    pub status: String,
    pub campaign_type: String,
    pub category: String,
    pub cover_image: String,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub donation_total: f64,
    pub donation_count: i64,
    pub creator_id: Uuid,
    pub creator_name: String,
    pub creator_username: Option<String>,
    pub creator_avatar: Option<String>,
    pub creator_creator_bio: Option<String>,
    pub creator_is_creator: bool,
}

impl From<CampaignDetailRow> for CampaignDetail {
    fn from(row: CampaignDetailRow) -> Self {
        Self {
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.description,
            story: row.story,
            goal_amount: row.goal_amount,
            current_amount: row.current_amount,
            currency: row.currency,
            status: row.status,
            campaign_type: row.campaign_type,
            category: row.category,
            cover_image: row.cover_image,
            images: row.images,
            video_url: row.video_url,
            start_date: row.start_date,
            end_date: row.end_date,
            created_at: row.created_at,
            updated_at: row.updated_at,
            donation_total: row.donation_total,
            donation_count: row.donation_count,
            creator: CreatorSummary {
                id: row.creator_id,
                name: row.creator_name,
                username: row.creator_username,
                avatar: row.creator_avatar,
                creator_bio: row.creator_creator_bio,
                is_creator: row.creator_is_creator,
            },
        }
    }
}
