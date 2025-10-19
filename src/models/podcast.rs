use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Podcast {
    pub id: Uuid,
    pub creator_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub language: Option<String>,
    pub cover_image: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PodcastSummary {
    pub id: Uuid,
    pub creator_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub language: Option<String>,
    pub cover_image: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PodcastEpisode {
    pub id: Uuid,
    pub podcast_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub episode_number: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub audio_url: String,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PodcastListResponse {
    pub podcasts: Vec<PodcastSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PodcastEpisodeListResponse {
    pub episodes: Vec<PodcastEpisode>,
}
