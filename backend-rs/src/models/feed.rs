use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedItem {
    pub id: String,
    pub source_id: String,
    pub r#type: String,
    pub title: String,
    pub summary: Option<String>,
    pub preview: Option<String>,
    pub cover_image: Option<String>,
    pub published_at: DateTime<Utc>,
    pub link: String,
    pub creator: FeedCreator,
    pub popularity_score: i32,
    pub is_highlight: bool,
    pub is_new: bool,
    pub is_saved: bool,
    pub badges: Vec<String>,
    pub meta: FeedItemMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedCreator {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub slug: String,
    pub follower_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedItemMeta {
    pub likes: Option<i32>,
    pub comments: Option<i32>,
    pub rsvps: Option<i32>,
    pub read_time: Option<i32>,
    pub visibility: Option<String>,
    pub period_start: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub price: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedCreator {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub creator_bio: Option<String>,
    pub follower_count: i32,
    pub is_followed: bool,
    pub slug: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedResponse {
    pub items: Vec<FeedItem>,
    pub highlights: Vec<FeedItem>,
    pub recommended_content: Vec<FeedItem>,
    pub recommended_creators: Vec<RecommendedCreator>,
    pub filters: FeedFilters,
    pub summary: FeedSummary,
    pub next_cursor: Option<String>,
    pub has_more: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedFilters {
    pub filter: String,
    pub sort: String,
    pub period: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedSummary {
    pub total_items: i32,
    pub highlight_count: i32,
    pub recommendations_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedBookmark {
    pub id: Uuid,
    pub user_id: Uuid,
    pub content_type: String,
    pub content_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBookmarkRequest {
    pub content_type: String,
    pub content_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoveBookmarkRequest {
    pub content_type: String,
    pub content_id: String,
}
