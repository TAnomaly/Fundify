use axum::{extract::State, routing::post, Json, Router};

use crate::{
    auth::AuthUser,
    error::AppError,
    http::{success, ApiResponse},
    models::post::{NewPost, Post},
    state::AppState,
};

pub fn posts_router() -> Router<AppState> {
    Router::new().route("/", post(create_post))
}

async fn create_post(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<NewPost>,
) -> Result<ApiResponse<Post>, AppError> {
    let mut tx = state.pool.begin().await?;

    let is_creator: bool = sqlx::query_scalar("SELECT \"isCreator\" FROM users WHERE id = $1")
        .bind(user.0.user_id)
        .fetch_one(&mut *tx)
        .await?;

    if !is_creator {
        return Err(AppError::Forbidden);
    }

    let post = sqlx::query_as!(
        Post,
        r#"\n        INSERT INTO creator_posts (title, content, excerpt, images, \"videoUrl\", attachments, \"isPublic\", \"minimumTierId\", published, \"publishedAt\", \"authorId\")\n        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\n        RETURNING\n            id,\n            title,\n            content,\n            excerpt,\n            images,\n            \"videoUrl\",\n            attachments,\n            \"isPublic\",\n            \"minimumTierId\",\n            published,\n            \"publishedAt\",\n            \"authorId\",\n            \"createdAt\",\n            \"updatedAt\"\n        "#,
        payload.title,
        payload.content,
        payload.excerpt,
        payload.images.as_deref().unwrap_or(&[]),
        payload.video_url,
        payload.attachments.as_deref().unwrap_or(&[]),
        payload.is_public.unwrap_or(false),
        payload.minimum_tier_id,
        payload.published.unwrap_or(true),
        payload.published_at.unwrap_or_else(chrono::Utc::now),
        user.0.user_id
    )
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(success(post)))
}