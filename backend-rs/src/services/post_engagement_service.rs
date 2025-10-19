use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CommentCreateRequest {
    pub content: String,
    pub user_id: Uuid,
    pub post_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct CommentResponse {
    pub id: Uuid,
    pub content: String,
    pub user_id: Uuid,
    pub post_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub user: CommentUser,
}

#[derive(Debug, Serialize)]
pub struct CommentUser {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LikeResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub post_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub is_liked: bool,
}

pub async fn toggle_like(
    state: &SharedState,
    user_id: Uuid,
    post_id: Uuid,
) -> Result<LikeResponse, AppError> {
    // Check if like already exists
    let existing_like = sqlx::query!(
        "SELECT id FROM post_likes WHERE user_id = $1 AND post_id = $2",
        user_id,
        post_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    if let Some(like) = existing_like {
        // Unlike
        sqlx::query!(
            "DELETE FROM post_likes WHERE id = $1",
            like.id
        )
        .execute(&state.db_pool)
        .await?;

        // Update post like count
        sqlx::query!(
            "UPDATE creator_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1",
            post_id
        )
        .execute(&state.db_pool)
        .await?;

        Ok(LikeResponse {
            id: like.id,
            user_id,
            post_id,
            created_at: Utc::now(),
            is_liked: false,
        })
    } else {
        // Like
        let like_id = Uuid::new_v4();
        
        sqlx::query!(
            r#"
            INSERT INTO post_likes (id, user_id, post_id, created_at)
            VALUES ($1, $2, $3, NOW())
            "#,
            like_id,
            user_id,
            post_id
        )
        .execute(&state.db_pool)
        .await?;

        // Update post like count
        sqlx::query!(
            "UPDATE creator_posts SET like_count = like_count + 1 WHERE id = $1",
            post_id
        )
        .execute(&state.db_pool)
        .await?;

        Ok(LikeResponse {
            id: like_id,
            user_id,
            post_id,
            created_at: Utc::now(),
            is_liked: true,
        })
    }
}

pub async fn get_user_likes(
    state: &SharedState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<LikeResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let likes = sqlx::query!(
        r#"
        SELECT id, user_id, post_id, created_at
        FROM post_likes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for like in likes {
        result.push(LikeResponse {
            id: like.id,
            user_id: like.user_id,
            post_id: like.post_id,
            created_at: like.created_at,
            is_liked: true,
        });
    }

    Ok(result)
}

pub async fn add_comment(
    state: &SharedState,
    input: CommentCreateRequest,
) -> Result<CommentResponse, AppError> {
    let comment_id = Uuid::new_v4();
    
    let comment = sqlx::query!(
        r#"
        INSERT INTO post_comments (id, content, user_id, post_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
        "#,
        comment_id,
        input.content,
        input.user_id,
        input.post_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    // Update post comment count
    sqlx::query!(
        "UPDATE creator_posts SET comment_count = comment_count + 1 WHERE id = $1",
        input.post_id
    )
    .execute(&state.db_pool)
    .await?;

    let user = sqlx::query!(
        "SELECT id, name, avatar FROM users WHERE id = $1",
        input.user_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(CommentResponse {
        id: comment.id,
        content: comment.content,
        user_id: comment.user_id,
        post_id: comment.post_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: CommentUser {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
        },
    })
}

pub async fn get_comments(
    state: &SharedState,
    post_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<CommentResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let comments = sqlx::query!(
        r#"
        SELECT 
            pc.*,
            u.name as user_name,
            u.avatar as user_avatar
        FROM post_comments pc
        JOIN users u ON pc.user_id = u.id
        WHERE pc.post_id = $1
        ORDER BY pc.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        post_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for comment in comments {
        result.push(CommentResponse {
            id: comment.id,
            content: comment.content,
            user_id: comment.user_id,
            post_id: comment.post_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user: CommentUser {
                id: comment.user_id,
                name: comment.user_name,
                avatar: comment.user_avatar,
            },
        });
    }

    Ok(result)
}

pub async fn delete_comment(
    state: &SharedState,
    user_id: Uuid,
    comment_id: Uuid,
) -> Result<(), AppError> {
    // Check if comment exists and user owns it
    let comment = sqlx::query!(
        "SELECT user_id, post_id FROM post_comments WHERE id = $1",
        comment_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let comment = match comment {
        Some(c) => c,
        None => return Err(AppError::NotFound("Comment not found".to_string())),
    };

    if comment.user_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    // Delete comment
    sqlx::query!(
        "DELETE FROM post_comments WHERE id = $1",
        comment_id
    )
    .execute(&state.db_pool)
    .await?;

    // Update post comment count
    sqlx::query!(
        "UPDATE creator_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1",
        comment.post_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}
