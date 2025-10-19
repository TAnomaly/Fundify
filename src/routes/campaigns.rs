use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::campaign::CampaignDetail;
use crate::services::campaign_service::{
    create_campaign, delete_campaign, get_campaign_by_slug, list_campaigns, update_campaign,
    CampaignInput, CampaignListFilters, CampaignListResponse, CampaignUpdateInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route(
            "/campaigns",
            get(handle_list_campaigns).post(handle_create_campaign),
        )
        .route("/campaigns/my", get(handle_list_my_campaigns))
        .route(
            "/campaigns/id/:id",
            put(handle_update_campaign).delete(handle_delete_campaign),
        )
        .route("/campaigns/:slug", get(handle_get_campaign_by_slug))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CampaignListQuery {
    status: Option<String>,
    category: Option<String>,
    search: Option<String>,
    #[serde(rename = "type")]
    campaign_type: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateCampaignRequest {
    #[validate(length(min = 3, max = 140))]
    title: String,
    #[validate(length(min = 10, max = 500))]
    description: String,
    #[validate(length(min = 50))]
    story: String,
    #[serde(default = "default_campaign_type")]
    campaign_type: String,
    #[validate(length(min = 3, max = 30))]
    category: String,
    #[validate(range(min = 1.0))]
    goal_amount: f64,
    #[validate(length(min = 3, max = 10))]
    currency: String,
    #[validate(url)]
    cover_image: String,
    #[serde(default)]
    images: Vec<String>,
    #[serde(default)]
    #[validate(url)]
    video_url: Option<String>,
    #[serde(default)]
    start_date: Option<DateTime<Utc>>,
    #[serde(default)]
    end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateCampaignRequest {
    #[validate(length(min = 3, max = 140))]
    title: Option<String>,
    #[validate(length(min = 10, max = 500))]
    description: Option<String>,
    #[validate(length(min = 50))]
    story: Option<String>,
    #[serde(default)]
    campaign_type: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    #[validate(range(min = 1.0))]
    goal_amount: Option<f64>,
    #[serde(default)]
    currency: Option<String>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    images: Option<Vec<String>>,
    #[serde(default)]
    #[validate(url)]
    video_url: Option<Option<String>>,
    #[serde(default)]
    start_date: Option<Option<DateTime<Utc>>>,
    #[serde(default)]
    end_date: Option<Option<DateTime<Utc>>>,
    #[serde(default)]
    status: Option<String>,
}

fn default_campaign_type() -> String {
    "PROJECT".to_string()
}

async fn handle_list_campaigns(
    State(state): State<SharedState>,
    Query(query): Query<CampaignListQuery>,
) -> Result<Json<CampaignListResponse>, AppError> {
    let filters = CampaignListFilters {
        status: query.status.map(to_upper_trimmed),
        category: query.category.map(to_upper_trimmed),
        search: query.search.map(|s| s.trim().to_string()),
        campaign_type: query.campaign_type.map(to_upper_trimmed),
        creator_id: None,
        page: query.page.unwrap_or(1),
        limit: query.limit.unwrap_or(10),
        enforce_active_default: true,
    };

    let response = list_campaigns(&state, filters).await?;
    Ok(Json(response))
}

async fn handle_get_campaign_by_slug(
    State(state): State<SharedState>,
    Path(slug): Path<String>,
) -> Result<Json<CampaignDetail>, AppError> {
    let campaign = get_campaign_by_slug(&state, &slug).await?;
    Ok(Json(campaign))
}

async fn handle_create_campaign(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateCampaignRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = CampaignInput {
        title: body.title.trim().to_string(),
        description: body.description.trim().to_string(),
        story: body.story.trim().to_string(),
        campaign_type: to_upper_trimmed(body.campaign_type),
        category: to_upper_trimmed(body.category),
        goal_amount: body.goal_amount,
        currency: to_upper_trimmed(body.currency),
        cover_image: body.cover_image.trim().to_string(),
        images: sanitize_images(body.images),
        video_url: body.video_url.and_then(sanitize_optional_string),
        start_date: body.start_date,
        end_date: body.end_date,
    };

    let campaign = create_campaign(&state, user_id, input).await?;
    Ok((StatusCode::CREATED, Json(campaign)))
}

async fn handle_update_campaign(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateCampaignRequest>,
) -> Result<Json<CampaignDetail>, AppError> {
    body.validate()?;

    let input = CampaignUpdateInput {
        title: body.title.map(|v| v.trim().to_string()),
        description: body.description.map(|v| v.trim().to_string()),
        story: body.story.map(|v| v.trim().to_string()),
        campaign_type: body.campaign_type.map(to_upper_trimmed),
        category: body.category.map(to_upper_trimmed),
        goal_amount: body.goal_amount,
        currency: body.currency.map(to_upper_trimmed),
        cover_image: body.cover_image.map(|v| v.trim().to_string()),
        images: body.images.map(sanitize_images),
        video_url: body
            .video_url
            .map(|opt| opt.and_then(sanitize_optional_string)),
        start_date: body.start_date,
        end_date: body.end_date,
        status: body.status.map(to_upper_trimmed),
    };

    let campaign = update_campaign(&state, user_id, id, input).await?;
    Ok(Json(campaign))
}

async fn handle_delete_campaign(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_campaign(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn handle_list_my_campaigns(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<CampaignListQuery>,
) -> Result<Json<CampaignListResponse>, AppError> {
    let filters = CampaignListFilters {
        status: query.status.map(to_upper_trimmed),
        category: query.category.map(to_upper_trimmed),
        search: query.search.map(|s| s.trim().to_string()),
        campaign_type: query.campaign_type.map(to_upper_trimmed),
        creator_id: Some(user_id),
        page: query.page.unwrap_or(1),
        limit: query.limit.unwrap_or(10),
        enforce_active_default: false,
    };

    let response = list_campaigns(&state, filters).await?;
    Ok(Json(response))
}

fn to_upper_trimmed(value: String) -> String {
    value.trim().to_ascii_uppercase()
}

fn sanitize_images(images: Vec<String>) -> Vec<String> {
    images
        .into_iter()
        .map(|img| img.trim().to_string())
        .filter(|img| !img.is_empty())
        .collect()
}

fn sanitize_optional_string(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}
