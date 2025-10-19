use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, patch, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, Postgres, QueryBuilder};
use tracing::instrument;
use uuid::Uuid;
use validator::Validate;

use crate::{
    auth::AuthUser,
    error::AppError,
    models::campaign::{CampaignSummary, CampaignWithCreator},
    state::AppState,
    utils::slugify,
};

#[derive(Debug, Deserialize)]
pub struct CampaignQuery {
    status: Option<String>,
    category: Option<String>,
    search: Option<String>,
    page: Option<usize>,
    limit: Option<usize>,
    r#type: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
struct CreateCampaignRequest {
    #[validate(length(min = 5, max = 100))]
    title: String,
    #[validate(length(min = 20, max = 200))]
    description: String,
    #[validate(length(min = 100))]
    story: String,
    #[serde(rename = "type")]
    campaign_type: String,
    category: String,
    #[validate(range(min = 0.01))]
    #[serde(rename = "goalAmount")]
    goal_amount: f64,
    currency: Option<String>,
    #[serde(rename = "coverImage")]
    cover_image: String,
    images: Option<Vec<String>>,
    #[serde(rename = "videoUrl")]
    video_url: Option<String>,
    #[serde(rename = "startDate")]
    start_date: Option<String>,
    #[serde(rename = "endDate")]
    end_date: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
struct UpdateCampaignRequest {
    #[validate(length(min = 5, max = 100))]
    title: Option<String>,
    #[validate(length(min = 20, max = 200))]
    description: Option<String>,
    #[validate(length(min = 100))]
    story: Option<String>,
    #[serde(rename = "type")]
    campaign_type: Option<String>,
    category: Option<String>,
    #[serde(rename = "goalAmount")]
    goal_amount: Option<f64>,
    #[serde(rename = "coverImage")]
    cover_image: Option<String>,
    images: Option<Vec<String>>,
    #[serde(rename = "videoUrl")]
    video_url: Option<String>,
    #[serde(rename = "startDate")]
    start_date: Option<String>,
    #[serde(rename = "endDate")]
    end_date: Option<String>,
    status: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_campaigns))
        .route("/", post(create_campaign))
        .route("/:id", patch(update_campaign))
        .route("/:id", delete(delete_campaign))
        .route("/me", get(list_my_campaigns))
}

#[instrument(skip(state))]
async fn list_campaigns(
    state: axum::extract::State<AppState>,
    Query(query): Query<CampaignQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(12).clamp(1, 100);
    let offset = (page - 1) * limit;

    let status = query.status.unwrap_or_else(|| "ACTIVE".to_string());
    let category_filter = query.category.clone();
    let type_filter = query.r#type.clone();
    let search_filter = query.search.clone();

    let mut builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            c.id,
            c.title,
            c.slug,
            c.description,
            c.category,
            c."coverImage" AS image_url,
            c."currentAmount" AS current_amount,
            c."goalAmount" AS goal,
            c."endDate" AS end_date,
            COALESCE(donation_counts.donation_count, 0) AS backers,
            FALSE AS featured
        FROM "Campaign" c
        LEFT JOIN (
            SELECT "campaignId", COUNT(*)::bigint AS donation_count
            FROM "Donation"
            WHERE status = 'COMPLETED'
            GROUP BY "campaignId"
        ) donation_counts ON donation_counts."campaignId" = c.id
        WHERE c.status = 
        "#,
    );
    builder.push_bind(status.clone());

    if let Some(category) = category_filter.clone() {
        builder.push(" AND c.category = ");
        builder.push_bind(category);
    }

    if let Some(t) = type_filter.clone() {
        builder.push(" AND c.\"type\" = ");
        builder.push_bind(t);
    }

    if let Some(search) = search_filter.clone() {
        let pattern = format!("%{}%", search);
        builder.push(" AND (c.title ILIKE ");
        builder.push_bind(pattern.clone());
        builder.push(" OR c.description ILIKE ");
        builder.push_bind(pattern);
        builder.push(")");
    }

    builder.push(" ORDER BY c.\"createdAt\" DESC LIMIT ");
    builder.push_bind(limit as i64);
    builder.push(" OFFSET ");
    builder.push_bind(offset as i64);

    let campaigns: Vec<CampaignSummary> = builder.build_query_as().fetch_all(&state.pool).await?;

    let mut count_builder =
        QueryBuilder::<Postgres>::new("SELECT COUNT(*) FROM \"Campaign\" c WHERE c.status = ");
    count_builder.push_bind(status.clone());

    if let Some(category) = category_filter {
        count_builder.push(" AND c.category = ");
        count_builder.push_bind(category);
    }

    if let Some(t) = type_filter {
        count_builder.push(" AND c.\"type\" = ");
        count_builder.push_bind(t);
    }

    if let Some(search) = search_filter {
        let pattern = format!("%{}%", search);
        count_builder.push(" AND (c.title ILIKE ");
        count_builder.push_bind(pattern.clone());
        count_builder.push(" OR c.description ILIKE ");
        count_builder.push_bind(pattern);
        count_builder.push(")");
    }

    let total: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "campaigns": campaigns,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total as f64 / limit as f64).ceil() as i64,
            }
        }
    })))
}

#[derive(Debug, Serialize, FromRow)]
struct MyCampaignRow {
    id: Uuid,
    title: String,
    slug: String,
    status: String,
    #[sqlx(rename = "goal_amount")]
    goal_amount: f64,
    #[sqlx(rename = "current_amount")]
    current_amount: f64,
    #[sqlx(rename = "cover_image")]
    cover_image: String,
    #[sqlx(rename = "created_at")]
    created_at: DateTime<Utc>,
    #[sqlx(rename = "donations_count")]
    donations_count: i64,
    #[sqlx(rename = "comments_count")]
    comments_count: i64,
}

#[derive(Debug, FromRow)]
struct CampaignOwnerRow {
    creator_id: Uuid,
}

#[instrument(skip(state, auth_user, payload))]
async fn create_campaign(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateCampaignRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let creator_id = parse_uuid(&auth_user.0.user_id)?;
    let campaign_type = validate_campaign_type(&payload.campaign_type)?;
    let category = validate_campaign_category(&payload.category)?;
    let currency = payload
        .currency
        .clone()
        .unwrap_or_else(|| "USD".to_string())
        .to_uppercase();
    let start_date = parse_datetime_optional(payload.start_date.as_deref())?;
    let end_date = parse_datetime_optional(payload.end_date.as_deref())?;
    validate_date_range(start_date.as_ref(), end_date.as_ref())?;

    let slug_base = slugify(&payload.title);
    let slug = generate_unique_slug(&state, &slug_base, None).await?;
    let images = payload.images.clone().unwrap_or_default();

    let inserted_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO "Campaign" (
            title,
            slug,
            description,
            story,
            "type",
            category,
            "goalAmount",
            "currentAmount",
            currency,
            status,
            "coverImage",
            images,
            "videoUrl",
            "startDate",
            "endDate",
            "creatorId"
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            0,
            $8,
            'ACTIVE',
            $9,
            $10,
            $11,
            $12,
            $13,
            $14
        )
        RETURNING id
        "#,
    )
    .bind(&payload.title)
    .bind(&slug)
    .bind(&payload.description)
    .bind(&payload.story)
    .bind(campaign_type)
    .bind(category)
    .bind(payload.goal_amount)
    .bind(&currency)
    .bind(&payload.cover_image)
    .bind(&images)
    .bind(&payload.video_url)
    .bind(start_date)
    .bind(end_date)
    .bind(creator_id)
    .fetch_one(&state.pool)
    .await?;

    let campaign = fetch_campaign_with_creator(&state, inserted_id).await?;

    Ok(Json(json!({
        "success": true,
        "message": "Campaign created successfully",
        "data": serialize_campaign(campaign)
    })))
}

#[instrument(skip(state, auth_user, payload))]
async fn update_campaign(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCampaignRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let requester_id = parse_uuid(&auth_user.0.user_id)?;
    let is_admin = auth_user.0.role.eq_ignore_ascii_case("ADMIN");

    let existing = sqlx::query_as::<_, CampaignOwnerRow>(
        r#"
        SELECT "creatorId" AS creator_id
        FROM "Campaign"
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if !is_admin && existing.creator_id != requester_id {
        return Err(AppError::Forbidden);
    }

    let mut builder = QueryBuilder::<Postgres>::new("UPDATE \"Campaign\" SET ");
    let mut separated = builder.separated(", ");
    let mut has_updates = false;

    let mut new_title = None;
    if let Some(title) = &payload.title {
        new_title = Some(title.clone());
        separated.push("title = ").push_bind(title);
        has_updates = true;
    }
    if let Some(description) = &payload.description {
        separated.push("description = ").push_bind(description);
        has_updates = true;
    }
    if let Some(story) = &payload.story {
        separated.push("story = ").push_bind(story);
        has_updates = true;
    }
    if let Some(c_type) = &payload.campaign_type {
        let validated = validate_campaign_type(c_type)?;
        separated.push("\"type\" = ").push_bind(validated);
        has_updates = true;
    }
    if let Some(category) = &payload.category {
        let validated = validate_campaign_category(category)?;
        separated.push("category = ").push_bind(validated);
        has_updates = true;
    }
    if let Some(goal) = payload.goal_amount {
        if goal <= 0.0 {
            return Err(AppError::BadRequest("Goal amount must be positive".into()));
        }
        separated.push("\"goalAmount\" = ").push_bind(goal);
        has_updates = true;
    }
    if let Some(cover_image) = &payload.cover_image {
        separated.push("\"coverImage\" = ").push_bind(cover_image);
        has_updates = true;
    }
    if let Some(images) = &payload.images {
        separated.push("images = ").push_bind(images);
        has_updates = true;
    }
    if let Some(video_url) = &payload.video_url {
        separated.push("\"videoUrl\" = ").push_bind(video_url);
        has_updates = true;
    }
    if let Some(status) = &payload.status {
        let validated = validate_campaign_status(status)?;
        separated.push("status = ").push_bind(validated);
        has_updates = true;
    }
    if let Some(start) = &payload.start_date {
        let parsed = parse_datetime_optional(Some(start))?;
        separated.push("\"startDate\" = ").push_bind(parsed);
        has_updates = true;
    }
    if let Some(end) = &payload.end_date {
        let parsed = parse_datetime_optional(Some(end))?;
        separated.push("\"endDate\" = ").push_bind(parsed);
        has_updates = true;
    }

    let mut slug_binding: Option<String> = None;
    if let Some(title) = new_title {
        let base = slugify(&title);
        let slug = generate_unique_slug(&state, &base, Some(id)).await?;
        slug_binding = Some(slug);
    }

    if let Some(slug) = slug_binding.as_ref() {
        separated.push("slug = ").push_bind(slug);
        has_updates = true;
    }

    if !has_updates {
        return Err(AppError::BadRequest("No updateable fields provided".into()));
    }

    builder.push(" WHERE id = ");
    builder.push_bind(id);
    builder.push(" RETURNING id");

    let query = builder.build_query_scalar::<Uuid>();
    query.fetch_one(&state.pool).await?;

    let campaign = fetch_campaign_with_creator(&state, id).await?;

    Ok(Json(json!({
        "success": true,
        "message": "Campaign updated successfully",
        "data": serialize_campaign(campaign)
    })))
}

#[instrument(skip(state, auth_user))]
async fn delete_campaign(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let requester_id = parse_uuid(&auth_user.0.user_id)?;
    let is_admin = auth_user.0.role.eq_ignore_ascii_case("ADMIN");

    let existing = sqlx::query_as::<_, CampaignOwnerRow>(
        r#"
        SELECT "creatorId" AS creator_id
        FROM "Campaign"
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if !is_admin && existing.creator_id != requester_id {
        return Err(AppError::Forbidden);
    }

    sqlx::query(
        r#"
        DELETE FROM "Campaign"
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&state.pool)
    .await?;

    Ok(Json(json!({
        "success": true,
        "message": "Campaign deleted successfully"
    })))
}

#[instrument(skip(state, auth_user))]
async fn list_my_campaigns(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let creator_id = parse_uuid(&auth_user.0.user_id)?;

    let rows: Vec<MyCampaignRow> = sqlx::query_as(
        r#"
        SELECT
            c.id,
            c.title,
            c.slug,
            c.status,
            c."goalAmount" AS goal_amount,
            c."currentAmount" AS current_amount,
            c."coverImage" AS cover_image,
            c."createdAt" AS created_at,
            (
                SELECT COUNT(*)::bigint
                FROM "Donation" d
                WHERE d."campaignId" = c.id
            ) AS donations_count,
            (
                SELECT COUNT(*)::bigint
                FROM "Comment" co
                WHERE co."campaignId" = c.id
            ) AS comments_count
        FROM "Campaign" c
        WHERE c."creatorId" = $1
        ORDER BY c."createdAt" DESC
        "#,
    )
    .bind(creator_id)
    .fetch_all(&state.pool)
    .await?;

    let campaigns: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            json!({
                "id": row.id,
                "title": row.title,
                "slug": row.slug,
                "status": row.status,
                "goalAmount": row.goal_amount,
                "currentAmount": row.current_amount,
                "coverImage": row.cover_image,
                "createdAt": row.created_at,
                "_count": {
                    "donations": row.donations_count,
                    "comments": row.comments_count,
                }
            })
        })
        .collect();

    Ok(Json(json!({
        "success": true,
        "data": campaigns
    })))
}

async fn fetch_campaign_with_creator(
    state: &AppState,
    id: Uuid,
) -> Result<CampaignWithCreator, AppError> {
    let campaign = sqlx::query_as::<_, CampaignWithCreator>(
        r#"
        SELECT
            c.id,
            c.title,
            c.slug,
            c.description,
            c.story,
            c.category,
            c."type" AS campaign_type,
            c.status,
            c."goalAmount" AS goal_amount,
            c."currentAmount" AS current_amount,
            c.currency,
            c."coverImage" AS cover_image,
            COALESCE(c.images, '{}'::text[]) AS images,
            c."videoUrl" AS video_url,
            c."startDate" AS start_date,
            c."endDate" AS end_date,
            c."creatorId" AS creator_id,
            u.name AS creator_name,
            u.avatar AS creator_avatar
        FROM "Campaign" c
        JOIN "User" u ON u.id = c."creatorId"
        WHERE c.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?;

    campaign.ok_or(AppError::NotFound)
}

fn serialize_campaign(campaign: CampaignWithCreator) -> serde_json::Value {
    json!({
        "id": campaign.id,
        "title": campaign.title,
        "slug": campaign.slug,
        "description": campaign.description,
        "story": campaign.story,
        "category": campaign.category,
        "type": campaign.campaign_type,
        "status": campaign.status,
        "goalAmount": campaign.goal_amount,
        "currentAmount": campaign.current_amount,
        "currency": campaign.currency,
        "coverImage": campaign.cover_image,
        "images": campaign.images,
        "videoUrl": campaign.video_url,
        "startDate": campaign.start_date,
        "endDate": campaign.end_date,
        "creator": {
            "id": campaign.creator_id,
            "name": campaign.creator_name,
            "avatar": campaign.creator_avatar
        }
    })
}

fn parse_uuid(id: &str) -> Result<Uuid, AppError> {
    Uuid::parse_str(id).map_err(|_| AppError::Auth("Invalid token payload".into()))
}

fn validate_campaign_type(value: &str) -> Result<&'static str, AppError> {
    match value {
        "PROJECT" => Ok("PROJECT"),
        "CREATOR" => Ok("CREATOR"),
        "CHARITY" => Ok("CHARITY"),
        _ => Err(AppError::BadRequest(
            "Invalid campaign type provided".into(),
        )),
    }
}

fn validate_campaign_category(value: &str) -> Result<&'static str, AppError> {
    match value {
        "TECHNOLOGY" => Ok("TECHNOLOGY"),
        "CREATIVE" => Ok("CREATIVE"),
        "COMMUNITY" => Ok("COMMUNITY"),
        "BUSINESS" => Ok("BUSINESS"),
        "EDUCATION" => Ok("EDUCATION"),
        "HEALTH" => Ok("HEALTH"),
        "ENVIRONMENT" => Ok("ENVIRONMENT"),
        "OTHER" => Ok("OTHER"),
        _ => Err(AppError::BadRequest(
            "Invalid campaign category provided".into(),
        )),
    }
}

fn validate_campaign_status(value: &str) -> Result<&'static str, AppError> {
    match value {
        "DRAFT" => Ok("DRAFT"),
        "ACTIVE" => Ok("ACTIVE"),
        "PAUSED" => Ok("PAUSED"),
        "COMPLETED" => Ok("COMPLETED"),
        "CANCELLED" => Ok("CANCELLED"),
        _ => Err(AppError::BadRequest(
            "Invalid campaign status provided".into(),
        )),
    }
}

fn parse_datetime_optional(value: Option<&str>) -> Result<Option<DateTime<Utc>>, AppError> {
    if let Some(raw) = value {
        let parsed = DateTime::parse_from_rfc3339(raw)
            .map_err(|_| AppError::BadRequest("Invalid ISO date format".into()))?;
        Ok(Some(parsed.with_timezone(&Utc)))
    } else {
        Ok(None)
    }
}

fn validate_date_range(
    start: Option<&DateTime<Utc>>,
    end: Option<&DateTime<Utc>>,
) -> Result<(), AppError> {
    if let (Some(start), Some(end)) = (start, end) {
        if end < start {
            return Err(AppError::BadRequest(
                "End date cannot be before start date".into(),
            ));
        }
    }
    Ok(())
}

async fn generate_unique_slug(
    state: &AppState,
    base: &str,
    exclude_id: Option<Uuid>,
) -> Result<String, AppError> {
    let base = if base.is_empty() {
        "campaign".to_string()
    } else {
        base.to_string()
    };
    let mut candidate = base.clone();
    let mut counter = 1;
    loop {
        let existing = sqlx::query_scalar::<_, Uuid>(
            r#"
            SELECT id
            FROM "Campaign"
            WHERE slug = $1
            "#,
        )
        .bind(&candidate)
        .fetch_optional(&state.pool)
        .await?;

        if let Some(record_id) = existing {
            if Some(record_id) == exclude_id {
                break Ok(candidate);
            }
            candidate = format!("{}-{}", base, counter);
            counter += 1;
        } else {
            break Ok(candidate);
        }
    }
}
