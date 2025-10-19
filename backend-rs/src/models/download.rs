use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Download {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub file_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
    pub mime_type: String,
    pub thumbnail_url: Option<String>,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub download_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadWithCreator {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub file_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
    pub mime_type: String,
    pub thumbnail_url: Option<String>,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub download_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: CreatorInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatorInfo {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDownloadRequest {
    pub title: String,
    pub description: Option<String>,
    pub file_url: String,
    pub file_name: String,
    pub file_size: i64,
    pub file_type: String,
    pub mime_type: String,
    pub thumbnail_url: Option<String>,
    pub is_public: Option<bool>,
    pub minimum_tier_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDownloadRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub file_type: Option<String>,
    pub mime_type: Option<String>,
    pub thumbnail_url: Option<String>,
    pub is_public: Option<bool>,
    pub minimum_tier_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResponse {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<DownloadWithCreator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadsListResponse {
    pub success: bool,
    pub data: Vec<DownloadWithCreator>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadHistoryResponse {
    pub success: bool,
    pub data: Vec<DownloadHistoryItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadHistoryItem {
    pub id: Uuid,
    pub download_id: Uuid,
    pub user_id: Uuid,
    pub downloaded_at: DateTime<Utc>,
    pub download: DownloadWithCreator,
}
