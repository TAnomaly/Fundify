use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::services::post_engagement_service::{
    add_comment, delete_comment, get_comments, get_user_likes, toggle_like,
    CommentCreateRequest, CommentResponse, LikeResponse,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/posts/:post_id/like", post(handle_toggle_like))
        .route("/posts/likes", get(handle_get_user_likes))
        .route("/posts/:post_id/comments", post(handle_add_comment).get(handle_get_comments))
        .route("/comments/:comment_id", delete(handle_delete_comment))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct AddCommentRequest {
    #[validate(length(min = 1, max = 1000))]
    content: String,
}

#[derive(Debug, Deserialize)]
struct CommentsQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct UserLikesQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn handle_toggle_like(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(post_id): Path<Uuid>,
) -> Result<Json<LikeResponse>, AppError> {
    let result = toggle_like(&state, user_id, post_id).await?;
    Ok(Json(result))
}

async fn handle_get_user_likes(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<UserLikesQuery>,
) -> Result<Json<Vec<LikeResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let likes = get_user_likes(&state, user_id, page, limit).await?;
    Ok(Json(likes))
}

async fn handle_add_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(post_id): Path<Uuid>,
    Json(body): Json<AddCommentRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = CommentCreateRequest {
        content: body.content,
        user_id,
        post_id,
    };

    let comment = add_comment(&state, input).await?;
    Ok((StatusCode::CREATED, Json(comment)))
}

async fn handle_get_comments(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(post_id): Path<Uuid>,
    Query(query): Query<CommentsQuery>,
) -> Result<Json<Vec<CommentResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let comments = get_comments(&state, post_id, page, limit).await?;
    Ok(Json(comments))
}

async fn handle_delete_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(comment_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_comment(&state, user_id, comment_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
