use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Extension;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::middleware::auth::AuthUser;
use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(Deserialize)]
pub struct CreateCommentRequest {
    pub content: String,
    #[serde(rename = "campaignId")]
    pub campaign_id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateCommentRequest {
    pub content: String,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Serialize)]
pub struct CommentResponse {
    pub id: String,
    pub content: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "campaignId")]
    pub campaign_id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub user: UserInfo,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replies: Option<Vec<CommentResponse>>,
}

pub async fn create_comment(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    axum::Json(req): axum::Json<CreateCommentRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate content
    if req.content.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Comment content cannot be empty".to_string(),
        ));
    }

    // Check if campaign exists
    let campaign: Option<(String,)> = sqlx::query_as(r#"SELECT id FROM "Campaign" WHERE id = $1"#)
        .bind(&req.campaign_id)
        .fetch_optional(&state.db)
        .await?;

    if campaign.is_none() {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    }

    // If it's a reply, check if parent comment exists and belongs to same campaign
    if let Some(ref parent_id) = req.parent_id {
        let parent: Option<(String, String)> =
            sqlx::query_as(r#"SELECT id, "campaignId" FROM "Comment" WHERE id = $1"#)
                .bind(parent_id)
                .fetch_optional(&state.db)
                .await?;

        match parent {
            None => {
                return Err(AppError::NotFound("Parent comment not found".to_string()));
            }
            Some((_, parent_campaign_id)) => {
                if parent_campaign_id != req.campaign_id {
                    return Err(AppError::BadRequest(
                        "Parent comment does not belong to this campaign".to_string(),
                    ));
                }
            }
        }
    }

    // Create comment
    let comment_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO "Comment" (id, content, "userId", "campaignId", "parentId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())"#
    )
    .bind(comment_id.to_string())
    .bind(req.content.trim())
    .bind(auth_user.id.to_string())
    .bind(&req.campaign_id)
    .bind(&req.parent_id)
    .execute(&state.db)
    .await?;

    // Fetch created comment with user info
    let row = sqlx::query(
        r#"SELECT c.id, c.content, c."userId", c."campaignId", c."parentId", c."createdAt", c."updatedAt",
           u.id as user_id, u.name as user_name, u.avatar as user_avatar
        FROM "Comment" c
        LEFT JOIN "User" u ON c."userId" = u.id
        WHERE c.id = $1"#
    )
    .bind(comment_id.to_string())
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    let comment = CommentResponse {
        id: row.get("id"),
        content: row.get("content"),
        user_id: row.get("userId"),
        campaign_id: row.get("campaignId"),
        parent_id: row.get("parentId"),
        created_at: row
            .get::<chrono::NaiveDateTime, _>("createdAt")
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
        updated_at: row
            .get::<chrono::NaiveDateTime, _>("updatedAt")
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
        user: UserInfo {
            id: row.get("user_id"),
            name: row.get("user_name"),
            avatar: row.get("user_avatar"),
        },
        replies: None,
    };

    Ok((StatusCode::CREATED, ApiResponse::success(comment)))
}

pub async fn get_comments_by_campaign(
    State(state): State<AppState>,
    Path(campaign_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    // Get all top-level comments (no parent)
    let rows = sqlx::query(
        r#"SELECT c.id, c.content, c."userId", c."campaignId", c."parentId", c."createdAt", c."updatedAt",
           u.id as user_id, u.name as user_name, u.avatar as user_avatar
        FROM "Comment" c
        LEFT JOIN "User" u ON c."userId" = u.id
        WHERE c."campaignId" = $1 AND c."parentId" IS NULL
        ORDER BY c."createdAt" DESC"#
    )
    .bind(&campaign_id)
    .fetch_all(&state.db)
    .await?;

    use sqlx::Row;
    let mut comments = Vec::new();

    for row in rows {
        let comment_id: String = row.get("id");

        // Get replies for this comment
        let reply_rows = sqlx::query(
            r#"SELECT c.id, c.content, c."userId", c."campaignId", c."parentId", c."createdAt", c."updatedAt",
               u.id as user_id, u.name as user_name, u.avatar as user_avatar
            FROM "Comment" c
            LEFT JOIN "User" u ON c."userId" = u.id
            WHERE c."parentId" = $1
            ORDER BY c."createdAt" ASC"#
        )
        .bind(&comment_id)
        .fetch_all(&state.db)
        .await?;

        let mut replies = Vec::new();
        for reply_row in reply_rows {
            replies.push(CommentResponse {
                id: reply_row.get("id"),
                content: reply_row.get("content"),
                user_id: reply_row.get("userId"),
                campaign_id: reply_row.get("campaignId"),
                parent_id: reply_row.get("parentId"),
                created_at: reply_row
                    .get::<chrono::NaiveDateTime, _>("createdAt")
                    .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                    .to_string(),
                updated_at: reply_row
                    .get::<chrono::NaiveDateTime, _>("updatedAt")
                    .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                    .to_string(),
                user: UserInfo {
                    id: reply_row.get("user_id"),
                    name: reply_row.get("user_name"),
                    avatar: reply_row.get("user_avatar"),
                },
                replies: None,
            });
        }

        comments.push(CommentResponse {
            id: row.get("id"),
            content: row.get("content"),
            user_id: row.get("userId"),
            campaign_id: row.get("campaignId"),
            parent_id: row.get("parentId"),
            created_at: row
                .get::<chrono::NaiveDateTime, _>("createdAt")
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
            updated_at: row
                .get::<chrono::NaiveDateTime, _>("updatedAt")
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
            user: UserInfo {
                id: row.get("user_id"),
                name: row.get("user_name"),
                avatar: row.get("user_avatar"),
            },
            replies: Some(replies),
        });
    }

    Ok(ApiResponse::success(comments))
}

pub async fn update_comment(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
    axum::Json(req): axum::Json<UpdateCommentRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate content
    if req.content.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Comment content cannot be empty".to_string(),
        ));
    }

    // Check if comment exists and get owner
    let comment: Option<(String, String)> =
        sqlx::query_as(r#"SELECT id, "userId" FROM "Comment" WHERE id = $1"#)
            .bind(&id)
            .fetch_optional(&state.db)
            .await?;

    let (_, user_id) =
        comment.ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

    // Check ownership
    if user_id != auth_user.id.to_string() && auth_user.role != "ADMIN" {
        return Err(AppError::Forbidden(
            "You do not have permission to update this comment".to_string(),
        ));
    }

    // Update comment
    sqlx::query(r#"UPDATE "Comment" SET content = $1, "updatedAt" = NOW() WHERE id = $2"#)
        .bind(req.content.trim())
        .bind(&id)
        .execute(&state.db)
        .await?;

    // Fetch updated comment with user info
    let row = sqlx::query(
        r#"SELECT c.id, c.content, c."userId", c."campaignId", c."parentId", c."createdAt", c."updatedAt",
           u.id as user_id, u.name as user_name, u.avatar as user_avatar
        FROM "Comment" c
        LEFT JOIN "User" u ON c."userId" = u.id
        WHERE c.id = $1"#
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    let comment = CommentResponse {
        id: row.get("id"),
        content: row.get("content"),
        user_id: row.get("userId"),
        campaign_id: row.get("campaignId"),
        parent_id: row.get("parentId"),
        created_at: row
            .get::<chrono::NaiveDateTime, _>("createdAt")
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
        updated_at: row
            .get::<chrono::NaiveDateTime, _>("updatedAt")
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
        user: UserInfo {
            id: row.get("user_id"),
            name: row.get("user_name"),
            avatar: row.get("user_avatar"),
        },
        replies: None,
    };

    Ok(ApiResponse::success(comment))
}

pub async fn delete_comment(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    // Check if comment exists and get owner
    let comment: Option<(String, String)> =
        sqlx::query_as(r#"SELECT id, "userId" FROM "Comment" WHERE id = $1"#)
            .bind(&id)
            .fetch_optional(&state.db)
            .await?;

    let (_, user_id) =
        comment.ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

    // Check ownership
    if user_id != auth_user.id.to_string() && auth_user.role != "ADMIN" {
        return Err(AppError::Forbidden(
            "You do not have permission to delete this comment".to_string(),
        ));
    }

    // Delete comment (cascade will delete replies if database is configured)
    sqlx::query(r#"DELETE FROM "Comment" WHERE id = $1"#)
        .bind(&id)
        .execute(&state.db)
        .await?;

    Ok(ApiResponse::success("Comment deleted successfully"))
}
