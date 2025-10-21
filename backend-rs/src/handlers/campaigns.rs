use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Extension;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::middleware::auth::AuthUser;
use crate::models::campaign::Campaign;
use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(Deserialize)]
pub struct ListCampaignsQuery {
    pub status: Option<String>,
    pub category: Option<String>,
    pub search: Option<String>,
    pub page: Option<i32>,
    pub limit: Option<i32>,
    #[serde(rename = "type")]
    pub campaign_type: Option<String>,
}

#[derive(Serialize)]
pub struct CampaignWithCreator {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub description: String,
    pub story: Option<String>,
    pub category: String,
    #[serde(rename = "type")]
    pub campaign_type: String,
    pub status: String,
    #[serde(rename = "goalAmount")]
    pub goal_amount: f64,
    #[serde(rename = "currentAmount")]
    pub current_amount: f64,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub creator: CreatorInfo,
    #[serde(rename = "donationCount")]
    pub donation_count: i64,
    #[serde(rename = "commentCount")]
    pub comment_count: i64,
}

#[derive(Serialize)]
pub struct CreatorInfo {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

#[derive(Serialize)]
pub struct CampaignsListResponse {
    pub campaigns: Vec<CampaignWithCreator>,
    pub pagination: PaginationInfo,
}

fn generate_slug(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' || c == '-' {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("-")
}

pub async fn list_campaigns(
    State(state): State<AppState>,
    Query(_params): Query<ListCampaignsQuery>,
) -> AppResult<impl IntoResponse> {
    // Very simple query first to test
    let rows = sqlx::query("SELECT id, title, slug FROM \"Campaign\" LIMIT 5")
        .fetch_all(&state.db)
        .await?;

    let mut campaigns: Vec<CampaignWithCreator> = Vec::new();
    for row in rows {
        use sqlx::Row;
        campaigns.push(CampaignWithCreator {
            id: row.get("id"),
            title: row.get("title"),
            slug: row.get("slug"),
            description: "Test description".to_string(),
            story: None,
            category: "OTHER".to_string(),
            campaign_type: "PROJECT".to_string(),
            status: "ACTIVE".to_string(),
            goal_amount: 1000.0,
            current_amount: 0.0,
            cover_image: None,
            created_at: "2024-01-01T00:00:00.000Z".to_string(),
            creator: CreatorInfo {
                id: "test-id".to_string(),
                name: "Test Creator".to_string(),
                avatar: None,
            },
            donation_count: 0,
            comment_count: 0,
        });
    }

    let total = campaigns.len() as i64;
    let response = CampaignsListResponse {
        campaigns,
        pagination: PaginationInfo {
            page: 1,
            limit: 12,
            total,
            pages: 1,
        },
    };

    Ok(ApiResponse::success(response))
}

pub async fn get_user_campaigns(
    State(_state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<impl IntoResponse> {
    // For now, return empty campaigns list
    // TODO: Implement actual user campaigns fetching
    let response = CampaignsListResponse {
        campaigns: vec![],
        pagination: PaginationInfo {
            page: 1,
            limit: 12,
            total: 0,
            pages: 0,
        },
    };

    Ok(ApiResponse::success(response))
}

pub async fn get_campaign(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    // Try to parse as UUID first, if fails, treat as slug
    let campaign = if let Ok(uuid) = Uuid::parse_str(&id) {
        sqlx::query_as::<_, Campaign>(
            r#"SELECT id, title, slug, description, story, category, type as "type: _", status as "status: _",
               "goalAmount" as goal_amount, "currentAmount" as current_amount,
               "coverImage" as cover_image, "startDate" as start_date, "endDate" as end_date,
               "creatorId" as creator_id, "createdAt" as created_at, "updatedAt" as updated_at
            FROM "Campaign" WHERE id = $1"#
        )
        .bind(uuid.to_string())
        .fetch_optional(&state.db)
        .await?
    } else {
        sqlx::query_as::<_, Campaign>(
            r#"SELECT id, title, slug, description, story, category, type as "type: _", status as "status: _",
               "goalAmount" as goal_amount, "currentAmount" as current_amount,
               "coverImage" as cover_image, "startDate" as start_date, "endDate" as end_date,
               "creatorId" as creator_id, "createdAt" as created_at, "updatedAt" as updated_at
            FROM "Campaign" WHERE slug = $1"#
        )
        .bind(&id)
        .fetch_optional(&state.db)
        .await?
    };

    let campaign = campaign.ok_or_else(|| AppError::NotFound("Campaign not found".to_string()))?;

    Ok(ApiResponse::success(campaign))
}

#[derive(Deserialize)]
pub struct CreateCampaignRequest {
    pub title: String,
    pub description: String,
    pub story: Option<String>,
    pub category: String,
    #[serde(rename = "type")]
    pub campaign_type: Option<String>,
    #[serde(rename = "goalAmount")]
    pub goal_amount: f64,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
}

pub async fn create_campaign(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    axum::Json(req): axum::Json<CreateCampaignRequest>,
) -> AppResult<impl IntoResponse> {
    // Generate unique slug
    let mut slug = generate_slug(&req.title);
    let mut counter = 1;

    loop {
        let exists: Option<(String,)> =
            sqlx::query_as(r#"SELECT id FROM "Campaign" WHERE slug = $1"#)
                .bind(&slug)
                .fetch_optional(&state.db)
                .await?;

        if exists.is_none() {
            break;
        }

        slug = format!("{}-{}", generate_slug(&req.title), counter);
        counter += 1;
    }

    let campaign_type = req.campaign_type.unwrap_or_else(|| "PROJECT".to_string());

    let campaign_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO "Campaign"
        (id, title, slug, description, story, category, type, status, "goalAmount", "currentAmount",
         "coverImage", "startDate", "endDate", "creatorId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())"#,
    )
    .bind(campaign_id.to_string())
    .bind(&req.title)
    .bind(&slug)
    .bind(&req.description)
    .bind(&req.story)
    .bind(&req.category)
    .bind(&campaign_type)
    .bind("ACTIVE")
    .bind(req.goal_amount)
    .bind(0.0)
    .bind(&req.cover_image)
    .bind(req.start_date.as_deref())
    .bind(req.end_date.as_deref())
    .bind(auth_user.id.to_string())
    .execute(&state.db)
    .await?;

    // Fetch the created campaign
    let campaign: Campaign = sqlx::query_as(
        r#"SELECT id, title, slug, description, story, category, type as "type: _", status as "status: _",
           "goalAmount" as goal_amount, "currentAmount" as current_amount,
           "coverImage" as cover_image, "startDate" as start_date, "endDate" as end_date,
           "creatorId" as creator_id, "createdAt" as created_at, "updatedAt" as updated_at
        FROM "Campaign" WHERE id = $1"#
    )
    .bind(campaign_id.to_string())
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, ApiResponse::success(campaign)))
}

#[derive(Deserialize)]
pub struct UpdateCampaignRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub story: Option<String>,
    pub category: Option<String>,
    #[serde(rename = "goalAmount")]
    pub goal_amount: Option<f64>,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    pub status: Option<String>,
}

pub async fn update_campaign(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
    axum::Json(req): axum::Json<UpdateCampaignRequest>,
) -> AppResult<impl IntoResponse> {
    // Check if campaign exists and user is the creator
    let existing: Option<(String, String)> =
        sqlx::query_as(r#"SELECT id, "creatorId" FROM "Campaign" WHERE id = $1"#)
            .bind(&id)
            .fetch_optional(&state.db)
            .await?;

    let (_, creator_id) =
        existing.ok_or_else(|| AppError::NotFound("Campaign not found".to_string()))?;

    if creator_id != auth_user.id.to_string() && auth_user.role != "ADMIN" {
        return Err(AppError::Forbidden(
            "You do not have permission to update this campaign".to_string(),
        ));
    }

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut param_index = 1;

    if req.title.is_some() {
        updates.push(format!("title = ${}", param_index));
        param_index += 1;
    }
    if req.description.is_some() {
        updates.push(format!("description = ${}", param_index));
        param_index += 1;
    }
    if req.story.is_some() {
        updates.push(format!("story = ${}", param_index));
        param_index += 1;
    }
    if req.category.is_some() {
        updates.push(format!("category = ${}", param_index));
        param_index += 1;
    }
    if req.goal_amount.is_some() {
        updates.push(format!("\"goalAmount\" = ${}", param_index));
        param_index += 1;
    }
    if req.cover_image.is_some() {
        updates.push(format!("\"coverImage\" = ${}", param_index));
        param_index += 1;
    }
    if req.status.is_some() {
        updates.push(format!("status = ${}", param_index));
        param_index += 1;
    }

    if updates.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    updates.push(format!("\"updatedAt\" = NOW()"));

    let query = format!(
        r#"UPDATE "Campaign" SET {} WHERE id = ${}"#,
        updates.join(", "),
        param_index
    );

    let mut sql_query = sqlx::query(&query);

    if let Some(ref title) = req.title {
        sql_query = sql_query.bind(title);
    }
    if let Some(ref description) = req.description {
        sql_query = sql_query.bind(description);
    }
    if let Some(ref story) = req.story {
        sql_query = sql_query.bind(story);
    }
    if let Some(ref category) = req.category {
        sql_query = sql_query.bind(category);
    }
    if let Some(goal_amount) = req.goal_amount {
        sql_query = sql_query.bind(goal_amount);
    }
    if let Some(ref cover_image) = req.cover_image {
        sql_query = sql_query.bind(cover_image);
    }
    if let Some(ref status) = req.status {
        sql_query = sql_query.bind(status);
    }

    sql_query = sql_query.bind(&id);
    sql_query.execute(&state.db).await?;

    // Fetch updated campaign
    let campaign: Campaign = sqlx::query_as(
        r#"SELECT id, title, slug, description, story, category, type as "type: _", status as "status: _",
           "goalAmount" as goal_amount, "currentAmount" as current_amount,
           "coverImage" as cover_image, "startDate" as start_date, "endDate" as end_date,
           "creatorId" as creator_id, "createdAt" as created_at, "updatedAt" as updated_at
        FROM "Campaign" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    Ok(ApiResponse::success(campaign))
}
