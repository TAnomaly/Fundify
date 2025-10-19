use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use uuid::Uuid;

use crate::{
    models::comment::{
        CommentResponse, CommentsListResponse, CreateCommentRequest, UpdateCommentRequest,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

pub fn comments_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_comment))
        .route("/campaign/:campaign_id", get(get_comments_by_campaign))
        .route("/:id", put(update_comment))
        .route("/:id", delete(delete_comment))
}

async fn create_comment(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<Json<CommentResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if campaign exists
    let campaign = sqlx::query!(
        "SELECT id FROM campaigns WHERE id = $1",
        payload.campaign_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if campaign.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Campaign not found"
            })),
        ));
    }

    // If it's a reply, check if parent comment exists
    if let Some(parent_id) = payload.parent_id {
        let parent_comment = sqlx::query!(
            "SELECT id, campaign_id FROM comments WHERE id = $1",
            parent_id
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Database error"
                })),
            )
        })?;

        if let Some(parent) = parent_comment {
            if parent.campaign_id != payload.campaign_id {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Parent comment does not belong to this campaign"
                    })),
                ));
            }
        } else {
            return Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Parent comment not found"
                })),
            ));
        }
    }

    // Create the comment
    let comment_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO comments (id, content, user_id, campaign_id, parent_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
        comment_id,
        payload.content,
        user.id,
        payload.campaign_id,
        payload.parent_id,
        now,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to create comment"
            })),
        )
    })?;

    // Fetch the created comment with user info
    let comment_with_user = sqlx::query_as!(
        crate::models::comment::CommentWithUser,
        r#"
        SELECT 
            c.id,
            c.content,
            c.user_id,
            c.campaign_id,
            c.parent_id,
            c.created_at,
            c.updated_at,
            u.id as "user_id",
            u.name as "user_name",
            u.avatar as "user_avatar"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
        "#,
        comment_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to fetch created comment"
            })),
        )
    })?;

    Ok(Json(CommentResponse {
        success: true,
        message: "Comment created successfully".to_string(),
        data: Some(comment_with_user),
    }))
}

async fn get_comments_by_campaign(
    State(state): State<AppState>,
    Path(campaign_id): Path<Uuid>,
) -> Result<Json<CommentsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let comments = sqlx::query_as!(
        crate::models::comment::CommentWithUser,
        r#"
        SELECT 
            c.id,
            c.content,
            c.user_id,
            c.campaign_id,
            c.parent_id,
            c.created_at,
            c.updated_at,
            u.id as "user_id",
            u.name as "user_name",
            u.avatar as "user_avatar"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.campaign_id = $1 AND c.parent_id IS NULL
        ORDER BY c.created_at DESC
        "#,
        campaign_id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    // For each top-level comment, fetch its replies
    let mut comments_with_replies = Vec::new();
    for mut comment in comments {
        let replies = sqlx::query_as!(
            crate::models::comment::CommentWithUser,
            r#"
            SELECT 
                c.id,
                c.content,
                c.user_id,
                c.campaign_id,
                c.parent_id,
                c.created_at,
                c.updated_at,
                u.id as "user_id",
                u.name as "user_name",
                u.avatar as "user_avatar"
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id = $1
            ORDER BY c.created_at ASC
            "#,
            comment.id
        )
        .fetch_all(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Database error"
                })),
            )
        })?;

        comment.replies = replies;
        comments_with_replies.push(comment);
    }

    Ok(Json(CommentsListResponse {
        success: true,
        data: comments_with_replies,
    }))
}

async fn update_comment(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(payload): Json<UpdateCommentRequest>,
) -> Result<Json<CommentResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if comment exists and user has permission
    let comment = sqlx::query!(
        "SELECT user_id FROM comments WHERE id = $1",
        comment_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(comment) = comment {
        if comment.user_id != user.id && user.role != "ADMIN" {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "You do not have permission to update this comment"
                })),
            ));
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Comment not found"
            })),
        ));
    }

    // Update the comment
    let now = chrono::Utc::now();
    sqlx::query!(
        "UPDATE comments SET content = $1, updated_at = $2 WHERE id = $3",
        payload.content,
        now,
        comment_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to update comment"
            })),
        )
    })?;

    // Fetch the updated comment with user info
    let comment_with_user = sqlx::query_as!(
        crate::models::comment::CommentWithUser,
        r#"
        SELECT 
            c.id,
            c.content,
            c.user_id,
            c.campaign_id,
            c.parent_id,
            c.created_at,
            c.updated_at,
            u.id as "user_id",
            u.name as "user_name",
            u.avatar as "user_avatar"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
        "#,
        comment_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to fetch updated comment"
            })),
        )
    })?;

    Ok(Json(CommentResponse {
        success: true,
        message: "Comment updated successfully".to_string(),
        data: Some(comment_with_user),
    }))
}

async fn delete_comment(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(comment_id): Path<Uuid>,
) -> Result<Json<CommentResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if comment exists and user has permission
    let comment = sqlx::query!(
        "SELECT user_id FROM comments WHERE id = $1",
        comment_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(comment) = comment {
        if comment.user_id != user.id && user.role != "ADMIN" {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "You do not have permission to delete this comment"
                })),
            ));
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Comment not found"
            })),
        ));
    }

    // Delete the comment
    sqlx::query!("DELETE FROM comments WHERE id = $1", comment_id)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to delete comment"
                })),
            )
        })?;

    Ok(Json(CommentResponse {
        success: true,
        message: "Comment deleted successfully".to_string(),
        data: None,
    }))
}
