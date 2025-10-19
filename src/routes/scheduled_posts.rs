use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::scheduled_post_service::{
    create_scheduled_post, delete_scheduled_post, get_scheduled_post, get_scheduled_posts,
    publish_scheduled_posts, update_scheduled_post,
    ScheduledPostCreateRequest, ScheduledPostResponse, ScheduledPostUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/scheduled-posts", post(handle_create_scheduled_post).get(handle_get_scheduled_posts))
        .route("/scheduled-posts/publish", post(handle_publish_scheduled_posts))
        .route("/scheduled-posts/:id", get(handle_get_scheduled_post).put(handle_update_scheduled_post).delete(handle_delete_scheduled_post))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateScheduledPostRequest {
    #[validate(length(min = 3, max = 200))]
    title: String,
    #[validate(length(min = 10, max = 10000))]
    content: String,
    #[validate(length(max = 500))]
    excerpt: Option<String>,
    #[serde(default)]
    images: Vec<String>,
    #[serde(default)]
    video_url: Option<String>,
    #[serde(default)]
    is_public: bool,
    #[serde(default)]
    is_premium: bool,
    #[serde(default)]
    tags: Vec<String>,
    scheduled_for: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateScheduledPostRequest {
    #[validate(length(min = 3, max = 200))]
    title: Option<String>,
    #[validate(length(min = 10, max = 10000))]
    content: Option<String>,
    #[validate(length(max = 500))]
    excerpt: Option<String>,
    #[serde(default)]
    images: Option<Vec<String>>,
    #[serde(default)]
    video_url: Option<Option<String>>,
    #[serde(default)]
    is_public: Option<bool>,
    #[serde(default)]
    is_premium: Option<bool>,
    #[serde(default)]
    tags: Option<Vec<String>>,
    #[serde(default)]
    scheduled_for: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
struct ScheduledPostsQuery {
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
}

async fn handle_create_scheduled_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateScheduledPostRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = ScheduledPostCreateRequest {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        images: body.images,
        video_url: body.video_url,
        is_public: body.is_public,
        is_premium: body.is_premium,
        tags: body.tags,
        scheduled_for: body.scheduled_for,
        creator_id: user_id,
    };

    let scheduled_post = create_scheduled_post(&state, input).await?;
    Ok((StatusCode::CREATED, Json(scheduled_post)))
}

async fn handle_get_scheduled_posts(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<ScheduledPostsQuery>,
) -> Result<Json<Vec<ScheduledPostResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let posts = get_scheduled_posts(&state, user_id, page, limit, query.status).await?;
    Ok(Json(posts))
}

async fn handle_get_scheduled_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ScheduledPostResponse>, AppError> {
    let post = get_scheduled_post(&state, user_id, id).await?;
    Ok(Json(post))
}

async fn handle_update_scheduled_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateScheduledPostRequest>,
) -> Result<Json<ScheduledPostResponse>, AppError> {
    body.validate()?;

    let input = ScheduledPostUpdateRequest {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        images: body.images,
        video_url: body.video_url,
        is_public: body.is_public,
        is_premium: body.is_premium,
        tags: body.tags,
        scheduled_for: body.scheduled_for,
    };

    let post = update_scheduled_post(&state, user_id, id, input).await?;
    Ok(Json(post))
}

async fn handle_delete_scheduled_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_scheduled_post(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn handle_publish_scheduled_posts(
    State(state): State<SharedState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = publish_scheduled_posts(&state).await?;
    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Scheduled posts processed",
        "data": result
    })))
}
