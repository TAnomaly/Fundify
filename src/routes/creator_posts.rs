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
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::services::creator_post_service::{
    create_creator_post, delete_creator_post, get_creator_post, get_creator_posts,
    get_my_posts, update_creator_post, CreatorPostCreateRequest, CreatorPostResponse,
    CreatorPostUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/posts", post(handle_create_creator_post))
        .route("/posts/my-posts", get(handle_get_my_posts))
        .route("/posts/creator/:creator_id", get(handle_get_creator_posts))
        .route("/posts/:post_id", get(handle_get_creator_post).put(handle_update_creator_post).delete(handle_delete_creator_post))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateCreatorPostRequest {
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
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateCreatorPostRequest {
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
    published: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct CreatorPostsQuery {
    page: Option<u32>,
    limit: Option<u32>,
    is_public: Option<bool>,
    is_premium: Option<bool>,
}

async fn handle_create_creator_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateCreatorPostRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = CreatorPostCreateRequest {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        images: body.images,
        video_url: body.video_url,
        is_public: body.is_public,
        is_premium: body.is_premium,
        tags: body.tags,
        author_id: user_id,
    };

    let post = create_creator_post(&state, input).await?;
    Ok((StatusCode::CREATED, Json(post)))
}

async fn handle_get_my_posts(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<CreatorPostsQuery>,
) -> Result<Json<Vec<CreatorPostResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let posts = get_my_posts(&state, user_id, page, limit).await?;
    Ok(Json(posts))
}

async fn handle_get_creator_posts(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(creator_id): Path<Uuid>,
    Query(query): Query<CreatorPostsQuery>,
) -> Result<Json<Vec<CreatorPostResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let posts = get_creator_posts(&state, creator_id, page, limit, query.is_public, query.is_premium).await?;
    Ok(Json(posts))
}

async fn handle_get_creator_post(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(post_id): Path<Uuid>,
) -> Result<Json<CreatorPostResponse>, AppError> {
    let post = get_creator_post(&state, post_id).await?;
    Ok(Json(post))
}

async fn handle_update_creator_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(post_id): Path<Uuid>,
    Json(body): Json<UpdateCreatorPostRequest>,
) -> Result<Json<CreatorPostResponse>, AppError> {
    body.validate()?;

    let input = CreatorPostUpdateRequest {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        images: body.images,
        video_url: body.video_url,
        is_public: body.is_public,
        is_premium: body.is_premium,
        tags: body.tags,
        published: body.published,
    };

    let post = update_creator_post(&state, user_id, post_id, input).await?;
    Ok(Json(post))
}

async fn handle_delete_creator_post(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(post_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_creator_post(&state, user_id, post_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
