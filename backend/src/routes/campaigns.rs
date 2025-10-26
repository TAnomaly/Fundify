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

const DEFAULT_COVER_IMAGE: &str =
    "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80";

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
    pub story: String,
    pub goal: f64,
    pub current_amount: f64,
    pub status: String,
    pub category: Option<String>,
    pub image_url: String,
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

        let CampaignRecord {
            id,
            title,
            description,
            story,
            goal_amount,
            current_amount,
            status,
            slug,
            cover_image,
            video_url,
            category,
            creator_id,
            end_date,
            created_at,
            updated_at,
        } = record;

        let creator_name: Option<String> = row.try_get("creator_name").unwrap_or(None);
        let creator_username: Option<String> = row.try_get("creator_username").unwrap_or(None);
        let creator_avatar: Option<String> = row.try_get("creator_avatar").unwrap_or(None);
        let creator =
            if creator_name.is_some() || creator_username.is_some() || creator_avatar.is_some() {
                Some(CampaignCreator {
                    id: creator_id.clone(),
                    name: creator_name,
                    username: creator_username,
                    avatar: creator_avatar,
                })
            } else {
                None
            };

        let story_value = story.unwrap_or_else(|| description.clone());
        let image_url = cover_image
            .filter(|url| !url.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_COVER_IMAGE.to_string());

        CampaignResponse {
            id,
            title,
            slug,
            description,
            story: story_value,
            goal: goal_amount,
            current_amount: current_amount.unwrap_or(0.0),
            status,
            category,
            image_url,
            video_url,
            creator_id,
            end_date,
            created_at,
            updated_at,
            creator,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CampaignQuery {
    pub page: Option<u32>,
    #[serde(alias = "pageSize")]
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
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(12).max(1);
    let offset = (page - 1) * limit;

    let count_query = "SELECT COUNT(*)::BIGINT FROM campaigns";
    let total_items = sqlx::query_scalar::<_, i64>(count_query)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count campaigns: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let query = r#"
        SELECT
            c.id,
            c.title,
            c.description,
            c.story,
            c.goal_amount,
            c.current_amount,
            c.status,
            c.slug,
            c.cover_image,
            c.video_url,
            c.category,
            c.creator_id,
            c.end_date,
            c.created_at,
            c.updated_at,
            u.display_name AS creator_name,
            u.username AS creator_username,
            u.avatar_url AS creator_avatar
        FROM campaigns c
        LEFT JOIN users u ON c.creator_id = u.id
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2
    "#;

    match sqlx::query(query)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
    {
        Ok(rows) => {
            let campaigns: Vec<CampaignResponse> =
                rows.iter().map(CampaignResponse::from_row).collect();

            let total_pages = if limit == 0 {
                0
            } else {
                ((total_items as f64) / (limit as f64)).ceil() as i64
            };

            let response = serde_json::json!({
                "success": true,
                "data": campaigns,
                "pagination": {
                    "page": page,
                    "pageSize": limit,
                    "totalItems": total_items,
                    "totalPages": total_pages
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
    let query = r#"
        WITH inserted AS (
            INSERT INTO campaigns (
                id,
                title,
                description,
                story,
                goal_amount,
                slug,
                status,
                creator_id,
                cover_image,
                video_url,
                category,
                end_date,
                created_at,
                updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
            )
            RETURNING
                id,
                title,
                description,
                story,
                goal_amount,
                current_amount,
                status,
                slug,
                cover_image,
                video_url,
                category,
                creator_id,
                end_date,
                created_at,
                updated_at
        )
        SELECT
            inserted.id,
            inserted.title,
            inserted.description,
            inserted.story,
            inserted.goal_amount,
            inserted.current_amount,
            inserted.status,
            inserted.slug,
            inserted.cover_image,
            inserted.video_url,
            inserted.category,
            inserted.creator_id,
            inserted.end_date,
            inserted.created_at,
            inserted.updated_at,
            u.display_name AS creator_name,
            u.username AS creator_username,
            u.avatar_url AS creator_avatar
        FROM inserted
        LEFT JOIN users u ON inserted.creator_id = u.id
    "#;

    match sqlx::query(query)
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
        .fetch_one(&db.pool)
        .await
    {
        Ok(row) => {
            let campaign = CampaignResponse::from_row(&row);
            let response = serde_json::json!({
                "success": true,
                "data": campaign
            });
            Ok(Json(response))
        }
        Err(e) => {
            tracing::error!("Error creating campaign: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_campaign_by_slug(
    State(db): State<Database>,
    Path(slug): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let query = r#"
        SELECT
            c.id,
            c.title,
            c.description,
            c.story,
            c.goal_amount,
            c.current_amount,
            c.status,
            c.slug,
            c.cover_image,
            c.video_url,
            c.category,
            c.creator_id,
            c.end_date,
            c.created_at,
            c.updated_at,
            u.display_name AS creator_name,
            u.username AS creator_username,
            u.avatar_url AS creator_avatar
        FROM campaigns c
        LEFT JOIN users u ON c.creator_id = u.id
        WHERE c.slug = $1
        LIMIT 1
    "#;

    match sqlx::query(query)
        .bind(&slug)
        .fetch_optional(&db.pool)
        .await
    {
        Ok(Some(row)) => {
            let campaign = CampaignResponse::from_row(&row);
            let response = serde_json::json!({
                "success": true,
                "data": campaign
            });

            Ok(Json(response))
        }
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to fetch campaign by slug: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
