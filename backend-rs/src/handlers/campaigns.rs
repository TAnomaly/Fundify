use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Extension;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::middleware::auth::AuthUser;
use crate::models::campaign::Campaign;
use crate::utils::{app_state::AppState, error::{AppError, AppResult}, response::ApiResponse};

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
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' { c } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("-")
}

pub async fn list_campaigns(
    State(state): State<AppState>,
    Query(params): Query<ListCampaignsQuery>,
) -> AppResult<impl IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(12).min(100);
    let skip = (page - 1) * limit;

    let status_filter = params.status.as_deref().unwrap_or("ACTIVE");

    // Build SQL query dynamically based on filters
    let mut query = String::from(
        r#"SELECT c.id, c.title, c.slug, c.description, c.story, c.category, c.type, c.status,
           c."goalAmount", c."currentAmount", c."coverImage", c."createdAt",
           u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
           COUNT(DISTINCT d.id) as donation_count,
           COUNT(DISTINCT com.id) as comment_count
        FROM "Campaign" c
        LEFT JOIN "User" u ON c."creatorId" = u.id
        LEFT JOIN "Donation" d ON c.id = d."campaignId"
        LEFT JOIN "Comment" com ON c.id = com."campaignId"
        WHERE c.status = $1"#,
    );

    let mut param_index = 2;
    let mut query_params: Vec<String> = vec![status_filter.to_string()];

    if let Some(category) = &params.category {
        query.push_str(&format!(" AND c.category = ${}", param_index));
        query_params.push(category.clone());
        param_index += 1;
    }

    if let Some(campaign_type) = &params.campaign_type {
        query.push_str(&format!(" AND c.type = ${}", param_index));
        query_params.push(campaign_type.clone());
        param_index += 1;
    }

    if let Some(search) = &params.search {
        query.push_str(&format!(
            " AND (c.title ILIKE ${} OR c.description ILIKE ${})",
            param_index,
            param_index + 1
        ));
        let search_pattern = format!("%{}%", search);
        query_params.push(search_pattern.clone());
        query_params.push(search_pattern);
        param_index += 2;
    }

    query.push_str(r#" GROUP BY c.id, c.title, c.slug, c.description, c.story, c.category, c.type, c.status,
           c."goalAmount", c."currentAmount", c."coverImage", c."createdAt",
           u.id, u.name, u.avatar
        ORDER BY c."createdAt" DESC
        LIMIT $"#);
    query.push_str(&param_index.to_string());
    query_params.push(limit.to_string());
    param_index += 1;

    query.push_str(" OFFSET $");
    query.push_str(&param_index.to_string());
    query_params.push(skip.to_string());

    // Execute query - using sqlx::query with manual row parsing
    let mut sql_query = sqlx::query(&query);

    for param in &query_params {
        sql_query = sql_query.bind(param);
    }

    let rows = sql_query.fetch_all(&state.db).await?;

    // Get total count
    let mut count_query = String::from(r#"SELECT COUNT(*) as total FROM "Campaign" WHERE status = $1"#);
    let mut count_params: Vec<String> = vec![status_filter.to_string()];
    let mut count_param_index = 2;

    if let Some(category) = &params.category {
        count_query.push_str(&format!(" AND category = ${}", count_param_index));
        count_params.push(category.clone());
        count_param_index += 1;
    }

    if let Some(campaign_type) = &params.campaign_type {
        count_query.push_str(&format!(" AND type = ${}", count_param_index));
        count_params.push(campaign_type.clone());
        count_param_index += 1;
    }

    if let Some(search) = &params.search {
        count_query.push_str(&format!(
            " AND (title ILIKE ${} OR description ILIKE ${})",
            count_param_index,
            count_param_index + 1
        ));
        let search_pattern = format!("%{}%", search);
        count_params.push(search_pattern.clone());
        count_params.push(search_pattern);
    }

    let mut count_sql = sqlx::query_as::<_, (i64,)>(&count_query);
    for param in &count_params {
        count_sql = count_sql.bind(param);
    }

    let (total,) = count_sql.fetch_one(&state.db).await?;

    // Map to response format - manually extract from rows
    let mut campaigns: Vec<CampaignWithCreator> = Vec::new();
    for row in rows {
        use sqlx::Row;
        campaigns.push(CampaignWithCreator {
            id: row.get("id"),
            title: row.get("title"),
            slug: row.get("slug"),
            description: row.get("description"),
            story: row.get("story"),
            category: row.get("category"),
            campaign_type: row.get("type"),
            status: row.get("status"),
            goal_amount: row.get("goalAmount"),
            current_amount: row.get("currentAmount"),
            cover_image: row.get("coverImage"),
            created_at: row.get::<chrono::NaiveDateTime, _>("createdAt").format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            creator: CreatorInfo {
                id: row.get("creator_id"),
                name: row.get("creator_name"),
                avatar: row.get("creator_avatar"),
            },
            donation_count: row.get("donation_count"),
            comment_count: row.get("comment_count"),
        });
    }

    let pages = ((total as f64) / (limit as f64)).ceil() as i32;

    let response = CampaignsListResponse {
        campaigns,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages,
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
        let exists: Option<(String,)> = sqlx::query_as(
            r#"SELECT id FROM "Campaign" WHERE slug = $1"#
        )
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())"#
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
    let existing: Option<(String, String)> = sqlx::query_as(
        r#"SELECT id, "creatorId" FROM "Campaign" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;

    let (_, creator_id) = existing.ok_or_else(|| AppError::NotFound("Campaign not found".to_string()))?;

    if creator_id != auth_user.id.to_string() && auth_user.role != "ADMIN" {
        return Err(AppError::Forbidden("You do not have permission to update this campaign".to_string()));
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