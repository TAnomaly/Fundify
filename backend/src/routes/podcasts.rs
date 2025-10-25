use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::Database;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Podcast {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub creator_id: String,
    pub episode_count: Option<i32>,
    pub total_duration: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct PodcastQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    #[serde(rename = "creatorId")]
    pub creator_id: Option<String>,
}

pub fn podcast_routes() -> Router<Database> {
    Router::new().route("/", get(get_podcasts))
}

#[derive(Debug, Serialize)]
struct PodcastsResponse {
    success: bool,
    data: Vec<Podcast>,
    pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
struct PaginationInfo {
    page: u32,
    limit: u32,
    total: usize,
    pages: u32,
}

async fn get_podcasts(
    State(db): State<Database>,
    Query(params): Query<PodcastQuery>,
) -> Result<Json<PodcastsResponse>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    // Mock data for now since we don't have a podcasts table
    let creator_id = params.creator_id.unwrap_or_default();
    let podcasts = if creator_id.is_empty() {
        vec![]
    } else {
        // Her creator için farklı podcast'ler döndür
        let podcast_titles = match creator_id.as_str() {
            "user1" => vec![
                "Rust Programming Deep Dive",
                "Web Development Tips",
                "System Design Patterns",
            ],
            "user2" => vec![
                "JavaScript Mastery",
                "React Best Practices",
                "Node.js Performance",
            ],
            _ => vec!["General Tech Talk", "Industry Insights"],
        };

        podcast_titles
            .into_iter()
            .map(|title| Podcast {
                id: Uuid::new_v4(),
                title: title.to_string(),
                description: Some(format!("A podcast episode about {}", title)),
                creator_id: creator_id.clone(),
                episode_count: Some(5),
                total_duration: Some("2h 30m".to_string()),
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
            })
            .collect()
    };

    let total = podcasts.len();
    let response = PodcastsResponse {
        success: true,
        data: podcasts,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages: 1,
        },
    };
    Ok(Json(response))
}
