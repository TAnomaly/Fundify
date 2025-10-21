use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Extension;
use bigdecimal::ToPrimitive;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::middleware::auth::AuthUser;
use crate::models::campaign::{Campaign, CampaignCategory, CampaignStatus, CampaignType};
use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(sqlx::FromRow)]
struct CampaignWithUserInfo {
    // Campaign fields
    id: Uuid,
    title: String,
    slug: String,
    description: String,
    story: String,
    category: CampaignCategory,
    campaign_type: CampaignType,
    status: CampaignStatus,
    goal_amount: bigdecimal::BigDecimal,
    current_amount: bigdecimal::BigDecimal,
    cover_image: String,
    created_at: DateTime<Utc>,
    
    // User fields
    creator_id: Uuid,
    creator_name: String,
    creator_avatar: Option<String>,
    
    // Aggregated counts
    donation_count: i64,
    comment_count: i64,
}

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
    Query(params): Query<ListCampaignsQuery>,
) -> AppResult<impl IntoResponse> {
    // Store the search pattern to ensure it lives long enough
    let search_pattern = params.search.as_ref().map(|s| format!("%{}%", s));
    let count_search_pattern = params.search.as_ref().map(|s| format!("%{}%", s));

    // Create a copy of the values to bind
    let status_val = params.status.clone();
    let category_val = params.category.clone();
    let campaign_type_val = params.campaign_type.clone();

    // Build the query with optional filters
    let mut query = String::from(r#"
        SELECT 
            c.id, c.title, c.slug, c.description, c.story, c.category, c.type as "type: _", 
            c.status as "status: _", c."goalAmount" as goal_amount, c."currentAmount" as current_amount,
            c."coverImage" as cover_image, c."createdAt" as created_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            COALESCE(donation_counts.donation_count, 0) as donation_count,
            COALESCE(comment_counts.comment_count, 0) as comment_count
        FROM "Campaign" c
        JOIN "User" u ON c."creatorId" = u.id
        LEFT JOIN (
            SELECT "campaignId", COUNT(*) as donation_count
            FROM "Donation"
            GROUP BY "campaignId"
        ) donation_counts ON c.id = donation_counts."campaignId"
        LEFT JOIN (
            SELECT "campaignId", COUNT(*) as comment_count
            FROM "Comment"
            GROUP BY "campaignId"
        ) comment_counts ON c.id = comment_counts."campaignId"
        WHERE 1=1
    "#);
    
    // Add optional filters
    if params.status.is_some() {
        query.push_str(" AND c.status = $1");
    } else {
        // Default to only active campaigns unless specified otherwise
        query.push_str(" AND c.status = 'ACTIVE'");
    }
    
    if params.category.is_some() {
        let param_position = if params.status.is_some() { 2 } else { 1 };
        query.push_str(&format!(" AND c.category = ${}", param_position));
    }
    
    if params.search.is_some() {
        let param_position = if params.status.is_some() { 1 } else { 0 } 
            + if params.category.is_some() { 1 } else { 0 } 
            + 1;
        query.push_str(&format!(" AND (c.title ILIKE ${} OR c.description ILIKE ${})", param_position, param_position));
    }
    
    if params.campaign_type.is_some() {
        let param_position = if params.status.is_some() { 1 } else { 0 } 
            + if params.category.is_some() { 1 } else { 0 } 
            + if params.search.is_some() { 1 } else { 0 } 
            + 1;
        query.push_str(&format!(" AND c.type = ${}", param_position));
    }
    
    // Add pagination
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(12).max(1).min(100);
    let offset = (page - 1) * limit;
    
    // Add ordering, limit and offset
    let total_params_count = if params.status.is_some() { 1 } else { 0 } 
        + if params.category.is_some() { 1 } else { 0 } 
        + if params.search.is_some() { 1 } else { 0 } 
        + if params.campaign_type.is_some() { 1 } else { 0 };
    
    query.push_str(" ORDER BY c.created_at DESC LIMIT $");
    query.push_str(&(total_params_count + 1).to_string());
    query.push_str(" OFFSET $");
    query.push_str(&(total_params_count + 2).to_string());
    
    // Now create the query builder and bind parameters
    let mut query_builder = sqlx::query_as::<_, CampaignWithUserInfo>(&query);
    
    // Bind parameters in the same order we added them to the query
    if let Some(ref status) = status_val {
        query_builder = query_builder.bind(status);
    }
    
    if let Some(ref category) = category_val {
        query_builder = query_builder.bind(category);
    }
    
    if let Some(ref pattern) = search_pattern {
        query_builder = query_builder.bind(pattern);
    }
    
    if let Some(ref campaign_type) = campaign_type_val {
        query_builder = query_builder.bind(campaign_type);
    }
    
    query_builder = query_builder.bind(limit).bind(offset);
    
    let campaigns = query_builder.fetch_all(&state.db).await?;

    // Convert to CampaignWithCreator format
    let campaigns_with_creator: Vec<CampaignWithCreator> = campaigns
        .into_iter()
        .map(|campaign| {
            CampaignWithCreator {
                id: campaign.id.to_string(),
                title: campaign.title,
                slug: campaign.slug,
                description: campaign.description,
                story: Some(campaign.story),
                category: format!("{:?}", campaign.category),
                campaign_type: format!("{:?}", campaign.campaign_type),
                status: format!("{:?}", campaign.status),
                goal_amount: campaign.goal_amount.to_f64().unwrap_or(0.0),
                current_amount: campaign.current_amount.to_f64().unwrap_or(0.0),
                cover_image: Some(campaign.cover_image),
                created_at: campaign.created_at.to_rfc3339(),
                creator: CreatorInfo {
                    id: campaign.creator_id.to_string(),
                    name: campaign.creator_name,
                    avatar: campaign.creator_avatar,
                },
                donation_count: campaign.donation_count,
                comment_count: campaign.comment_count,
            }
        })
        .collect();

    // Get total count for pagination - using the same filter logic
    let mut count_query = String::from(r#"SELECT COUNT(*) as total
        FROM "Campaign" c
        JOIN "User" u ON c."creatorId" = u.id
        WHERE 1=1"#);
    
    // Apply same filters to count query
    if params.status.is_some() {
        count_query.push_str(" AND c.status = $1");
    } else {
        // Default to only active campaigns unless specified otherwise
        count_query.push_str(" AND c.status = 'ACTIVE'");
    }
    
    if params.category.is_some() {
        let param_position = if params.status.is_some() { 2 } else { 1 };
        count_query.push_str(&format!(" AND c.category = ${}", param_position));
    }
    
    if params.search.is_some() {
        let param_position = if params.status.is_some() { 1 } else { 0 } 
            + if params.category.is_some() { 1 } else { 0 } 
            + 1;
        count_query.push_str(&format!(" AND (c.title ILIKE ${} OR c.description ILIKE ${})", param_position, param_position));
    }
    
    if params.campaign_type.is_some() {
        let param_position = if params.status.is_some() { 1 } else { 0 } 
            + if params.category.is_some() { 1 } else { 0 } 
            + if params.search.is_some() { 1 } else { 0 } 
            + 1;
        count_query.push_str(&format!(" AND c.type = ${}", param_position));
    }
    
    // Build and execute count query
    let mut count_query_builder = sqlx::query_as::<_, (i64,)>(&count_query);
    
    if let Some(ref status) = status_val {
        count_query_builder = count_query_builder.bind(status);
    }
    
    if let Some(ref category) = category_val {
        count_query_builder = count_query_builder.bind(category);
    }
    
    if let Some(ref pattern) = count_search_pattern {
        count_query_builder = count_query_builder.bind(pattern);
    }
    
    if let Some(ref campaign_type) = campaign_type_val {
        count_query_builder = count_query_builder.bind(campaign_type);
    }
    
    let total = count_query_builder.fetch_one(&state.db).await?.0;
    let pages = ((total as f64) / (limit as f64)).ceil() as i32;

    let pagination = PaginationInfo {
        page,
        limit,
        total,
        pages,
    };

    let response = CampaignsListResponse {
        campaigns: campaigns_with_creator,
        pagination,
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
