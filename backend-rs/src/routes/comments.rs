use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::comment_service::{
    create_comment, delete_comment, get_comments_by_campaign, update_comment,
    CommentResponse, CommentUser,
};
use crate::models::comment::{
    CommentCreateRequest, CommentUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/comments", post(handle_create_comment))
        .route("/comments/campaign/:campaign_id", get(handle_get_comments_by_campaign))
        .route("/comments/:id", put(handle_update_comment).delete(handle_delete_comment))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateCommentRequest {
    #[validate(length(min = 1, max = 1000))]
    content: String,
    campaign_id: Uuid,
    parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateCommentRequest {
    #[validate(length(min = 1, max = 1000))]
    content: String,
}


async fn handle_create_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateCommentRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = CommentCreateRequest {
        content: body.content,
        user_id,
        campaign_id: body.campaign_id,
        parent_id: body.parent_id,
    };

    let comment = create_comment(&state, input).await?;
    Ok((StatusCode::CREATED, Json(comment)))
}

async fn handle_get_comments_by_campaign(
    State(state): State<SharedState>,
    Path(campaign_id): Path<Uuid>,
) -> Result<Json<Vec<CommentResponse>>, AppError> {
    let comments = get_comments_by_campaign(&state, campaign_id).await?;
    Ok(Json(comments))
}

async fn handle_update_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateCommentRequest>,
) -> Result<Json<CommentResponse>, AppError> {
    body.validate()?;

    let input = CommentUpdateRequest {
        content: body.content,
    };

    let comment = update_comment(&state, user_id, id, input).await?;
    Ok(Json(comment))
}

async fn handle_delete_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_comment(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
