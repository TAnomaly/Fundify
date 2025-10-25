use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use sqlx::Row;

use crate::database::Database;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Campaign {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub goal_amount: f64,
    pub current_amount: Option<f64>,
    pub status: String,
    pub slug: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CampaignQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
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
        },
        Err(e) => {
            tracing::error!("Failed to fetch campaigns: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn create_campaign(
    State(db): State<Database>,
    claims: crate::auth::Claims,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    println!("🔄 Creating campaign for user: {}", claims.sub);
    println!("📝 Campaign payload: {}", serde_json::to_string(&payload).unwrap_or("Failed to serialize".to_string()));
    
    // Extract values from payload
    let title = payload.get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("New Campaign");
    
    let description = payload.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("Campaign description");
    
    let story = payload.get("story")
        .and_then(|v| v.as_str())
        .unwrap_or(description);
    
    let goal_amount = payload.get("goal_amount")
        .and_then(|v| v.as_f64())
        .unwrap_or(1000.0);
    
    let cover_image = payload.get("cover_image")
        .and_then(|v| v.as_str())
        .unwrap_or("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80");
    
    let video_url = payload.get("video_url")
        .and_then(|v| v.as_str());
    
    let category = payload.get("category")
        .and_then(|v| v.as_str())
        .unwrap_or("OTHER");
    
    let end_date = payload.get("end_date")
        .and_then(|v| v.as_str());
    
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
    .bind(story)
    .bind(goal_amount)
    .bind(&slug)
    .bind("DRAFT")
    .bind(&claims.sub)
    .bind(cover_image)
    .bind(video_url)
    .bind(category)
    .bind(end_date)
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
