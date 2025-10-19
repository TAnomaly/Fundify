use crate::error::AppError;
use crate::models::comment::{Comment, CommentCreateRequest, CommentUpdateRequest};
use crate::state::SharedState;
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct CommentResponse {
    pub id: Uuid,
    pub content: String,
    pub user_id: Uuid,
    pub campaign_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub user: CommentUser,
    pub replies: Vec<CommentResponse>,
}

#[derive(Debug, Serialize)]
pub struct CommentUser {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

pub async fn create_comment(
    state: &SharedState,
    input: CommentCreateRequest,
) -> Result<Comment, AppError> {
    // Check if campaign exists
    let campaign = sqlx::query!(
        "SELECT id FROM campaigns WHERE id = $1",
        input.campaign_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    if campaign.is_none() {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    }

    // If it's a reply, check if parent comment exists
    if let Some(parent_id) = input.parent_id {
        let parent_comment = sqlx::query!(
            "SELECT id, campaign_id FROM comments WHERE id = $1",
            parent_id
        )
        .fetch_optional(&state.db_pool)
        .await?;

        if let Some(parent) = parent_comment {
            if parent.campaign_id != input.campaign_id {
                return Err(AppError::BadRequest(
                    "Parent comment does not belong to this campaign".to_string(),
                ));
            }
        } else {
            return Err(AppError::NotFound("Parent comment not found".to_string()));
        }
    }

    let comment = sqlx::query_as!(
        Comment,
        r#"
        INSERT INTO comments (id, content, user_id, campaign_id, parent_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
        "#,
        uuid::Uuid::new_v4(),
        input.content,
        input.user_id,
        input.campaign_id,
        input.parent_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(comment)
}

pub async fn get_comments_by_campaign(
    state: &SharedState,
    campaign_id: Uuid,
) -> Result<Vec<CommentResponse>, AppError> {
    let comments = sqlx::query_as!(
        Comment,
        r#"
        SELECT c.*, u.name as user_name, u.avatar as user_avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.campaign_id = $1 AND c.parent_id IS NULL
        ORDER BY c.created_at DESC
        "#,
        campaign_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    // Convert Comment to CommentResponse
    let comment_responses: Vec<CommentResponse> = comments
        .into_iter()
        .map(|comment| CommentResponse {
            id: comment.id,
            content: comment.content,
            user_id: comment.user_id,
            campaign_id: comment.campaign_id,
            parent_id: comment.parent_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user: CommentUser {
                id: comment.user_id,
                name: comment.user_name,
                avatar: comment.user_avatar,
            },
            replies: Vec::new(), // TODO: Implement nested replies
        })
        .collect();

    Ok(comment_responses)
}

pub async fn update_comment(
    state: &SharedState,
    user_id: Uuid,
    comment_id: Uuid,
    input: CommentUpdateRequest,
) -> Result<CommentResponse, AppError> {
    // Check if comment exists and user owns it
    let comment = sqlx::query_as!(
        Comment,
        "SELECT * FROM comments WHERE id = $1",
        comment_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let comment = match comment {
        Some(c) => c,
        None => return Err(AppError::NotFound("Comment not found".to_string())),
    };

    if comment.user_id != user_id {
        return Err(AppError::Forbidden(
            "You do not have permission to update this comment".to_string(),
        ));
    }

    let updated_comment = sqlx::query_as!(
        Comment,
        r#"
        UPDATE comments 
        SET content = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
        "#,
        input.content,
        comment_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    // Get user info for the response
    let user = sqlx::query!(
        "SELECT id, name, avatar FROM users WHERE id = $1",
        updated_comment.user_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    let comment_response = CommentResponse {
        id: updated_comment.id,
        content: updated_comment.content,
        user_id: updated_comment.user_id,
        campaign_id: updated_comment.campaign_id,
        parent_id: updated_comment.parent_id,
        created_at: updated_comment.created_at,
        updated_at: updated_comment.updated_at,
        user: CommentUser {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
        },
        replies: Vec::new(),
    };

    Ok(comment_response)
}

pub async fn delete_comment(
    state: &SharedState,
    user_id: Uuid,
    comment_id: Uuid,
) -> Result<(), AppError> {
    // Check if comment exists and user owns it
    let comment = sqlx::query_as!(
        Comment,
        "SELECT * FROM comments WHERE id = $1",
        comment_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let comment = match comment {
        Some(c) => c,
        None => return Err(AppError::NotFound("Comment not found".to_string())),
    };

    if comment.user_id != user_id {
        return Err(AppError::Forbidden(
            "You do not have permission to delete this comment".to_string(),
        ));
    }

    sqlx::query!("DELETE FROM comments WHERE id = $1", comment_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}
