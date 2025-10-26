use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::database::Database;

#[derive(Debug, sqlx::FromRow)]
struct CampaignRecord {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub story: Option<String>,
    pub goal_amount: f64,
    pub current_amount: Option<f64>,
    pub status: String,
    pub slug: String,
    pub cover_image: Option<String>,
    pub video_url: Option<String>,
    pub category: Option<String>,
    pub creator_id: String,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CampaignCreator {
    pub id: String,
    pub name: Option<String>,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CampaignResponse {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: String,
    pub story: Option<String>,
    pub goal: f64,
    pub current_amount: f64,
    pub status: String,
    pub category: Option<String>,
    pub image_url: Option<String>,
    pub video_url: Option<String>,
    pub creator_id: String,
    pub end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: Option<CampaignCreator>,
}

impl CampaignResponse {
    fn from_row(row: &sqlx::postgres::PgRow) -> Self {
        let record = CampaignRecord {
            id: row.get("id"),
            title: row.get("title"),
            description: row.get("description"),
            story: row.get("story"),
            goal_amount: row.get("goal_amount"),
            current_amount: row.get("current_amount"),
            status: row.get("status"),
            slug: row.get("slug"),
            cover_image: row.get("cover_image"),
            video_url: row.get("video_url"),
            category: row.get("category"),
            creator_id: row.get("creator_id"),
            end_date: row.get("end_date"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };

        let creator = row
            .get::<Option<String>, _>("creator_name")
            .map(|_| CampaignCreator {
                id: record.creator_id.clone(),
                name: row.get("creator_name"),
                username: row.get("creator_username"),
                avatar: row.get("creator_avatar"),
            });

        CampaignResponse {
            id: record.id,
            title: record.title,
            slug: record.slug,
            description: record.description,
            story: record.story,
            goal: record.goal_amount,
            current_amount: record.current_amount.unwrap_or(0.0),
            status: record.status,
            category: record.category,
            image_url: record.cover_image,
            video_url: record.video_url,
            creator_id: record.creator_id,
            end_date: record.end_date,
            created_at: record.created_at,
            updated_at: record.updated_at,
            creator,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CampaignQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCampaignPayload {
    pub title: Option<String>,
    pub description: Option<String>,
    pub story: Option<String>,
    #[serde(alias = "goal", alias = "goalAmount")]
    pub goal_amount: Option<f64>,
    #[serde(alias = "coverImage", alias = "imageUrl")]
    pub cover_image: Option<String>,
    #[serde(alias = "videoUrl")]
    pub video_url: Option<String>,
    pub category: Option<String>,
    #[serde(alias = "endDate")]
    pub end_date: Option<String>,
}

pub fn campaign_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_campaigns))
        .route("/", post(create_campaign))
        .route("/:slug", get(get_campaign_by_slug))
}

async fn get_campaigns(
    State(db): State<Database>,
    Query(params): Query<CampaignQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(12);
    let offset = (page - 1) * limit;

    // Use simple SQL query with snake_case table and column names
    let query = "SELECT id, title, description, goal_amount, current_amount, status, slug, created_at, updated_at FROM campaigns ORDER BY created_at DESC LIMIT $1 OFFSET $2";

    match sqlx::query_as::<_, Campaign>(query)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
    {
        Ok(campaigns) => {
            // Frontend'in beklediği format
            let response = serde_json::json!({
                "success": true,
                "data": campaigns,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": campaigns.len(),
                    "pages": 1
                }
            });
            Ok(Json(response))
        }
        Err(e) => {
            tracing::error!("Failed to fetch campaigns: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn create_campaign(
    State(db): State<Database>,
    claims: crate::auth::Claims,
    Json(payload): Json<CreateCampaignPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    println!("🔄 Creating campaign for user: {}", claims.sub);

    let title = payload
        .title
        .as_deref()
        .filter(|t| !t.trim().is_empty())
        .unwrap_or("New Campaign");

    let description = payload
        .description
        .as_deref()
        .filter(|d| !d.trim().is_empty())
        .unwrap_or("Campaign description");

    let story = payload
        .story
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(description)
        .to_string();

    let goal_amount = payload.goal_amount.unwrap_or(1000.0);

    let cover_image = payload
        .cover_image
        .as_deref()
        .filter(|c| !c.trim().is_empty())
        .unwrap_or("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80");

    let video_url = payload
        .video_url
        .as_deref()
        .filter(|v| !v.trim().is_empty());

    let category = payload
        .category
        .as_deref()
        .filter(|c| !c.trim().is_empty())
        .unwrap_or("OTHER");

    let parsed_end_date = payload
        .end_date
        .as_deref()
        .and_then(|raw| chrono::DateTime::parse_from_rfc3339(raw).ok())
        .map(|dt| dt.with_timezone(&Utc));

    // Generate a unique slug from title
    let slug = title
        .to_lowercase()
        .replace(" ", "-")
        .replace("'", "")
        .replace("\"", "")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect::<String>();

    // Store campaign in database with all fields
    let campaign_id = uuid::Uuid::new_v4();
    let result = sqlx::query(
        "INSERT INTO campaigns (id, title, description, story, goal_amount, slug, status, creator_id, cover_image, video_url, category, end_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())"
    )
    .bind(campaign_id)
    .bind(title)
    .bind(description)
    .bind(&story)
    .bind(goal_amount)
    .bind(&slug)
    .bind("DRAFT")
    .bind(&claims.sub)
    .bind(cover_image)
    .bind(video_url)
    .bind(category)
    .bind(parsed_end_date)
    .execute(&db.pool)
    .await;

    match result {
        Ok(_) => {
            let response = serde_json::json!({
                "success": true,
                "data": {
                    "id": campaign_id,
                    "slug": slug,
                    "title": title,
                    "description": description,
                    "goal_amount": goal_amount,
                    "current_amount": 0.0,
                    "status": "DRAFT"
                }
            });
            Ok(Json(response))
        }
        Err(e) => {
            eprintln!("Error creating campaign: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_campaign_by_slug(
    State(db): State<Database>,
    Path(slug): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Query campaign from database by slug with all fields
    let campaign = sqlx::query(
        "SELECT c.id, c.title, c.description, c.goal_amount, c.current_amount, c.status, c.slug, c.created_at, c.updated_at,
                c.cover_image, c.video_url, c.story, c.category, c.end_date,
                u.id as creator_id, u.username, u.display_name, u.avatar_url, u.bio
         FROM campaigns c
         LEFT JOIN users u ON c.creator_id = u.id
         WHERE c.slug = $1"
    )
    .bind(&slug)
    .fetch_one(&db.pool)
    .await;

    match campaign {
        Ok(row) => {
            let id: Uuid = row.get("id");
            let title: String = row.get("title");
            let description: String = row.get("description");
            let goal_amount: f64 = row.get("goal_amount");
            let current_amount: Option<f64> = row.get("current_amount");
            let status: String = row.get("status");
            let slug: String = row.get("slug");
            let created_at: DateTime<Utc> = row.get("created_at");
            let cover_image: Option<String> = row.get("cover_image");
            let video_url: Option<String> = row.get("video_url");
            let story: Option<String> = row.get("story");
            let category: Option<String> = row.get("category");
            let end_date: Option<DateTime<Utc>> = row.get("end_date");

            // Creator info
            let creator_id: Option<Uuid> = row.get("creator_id");
            let username: Option<String> = row.get("username");
            let display_name: Option<String> = row.get("display_name");
            let avatar_url: Option<String> = row.get("avatar_url");
            let bio: Option<String> = row.get("bio");

            let response = serde_json::json!({
                "success": true,
                "data": {
                    "id": id,
                    "slug": slug,
                    "title": title,
                    "description": description,
                    "story": story.unwrap_or(description),
                    "goal": goal_amount,
                    "goalAmount": goal_amount,
                    "currentAmount": current_amount.unwrap_or(0.0),
                    "status": status,
                    "category": category.unwrap_or("OTHER".to_string()),
                    "imageUrl": cover_image.unwrap_or("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80".to_string()),
                    "videoUrl": video_url,
                    "endDate": end_date,
                    "createdAt": created_at,
                    "creator": creator_id.map(|_| {
                        serde_json::json!({
                            "id": creator_id,
                            "username": username,
                            "firstName": display_name,
                            "lastName": "",
                            "avatar": avatar_url,
                            "bio": bio
                        })
                    }),
                    "creatorId": creator_id,
                    "backers": 0
                }
            });
            Ok(Json(response))
        }
        Err(e) => {
            eprintln!("Error fetching campaign: {:?}", e);
            Err(StatusCode::NOT_FOUND)
        }
    }
}
