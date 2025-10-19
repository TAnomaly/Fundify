use axum::{extract::{Query, State}, routing::get, Json, Router};
use serde::Deserialize;

use crate::{error::AppError, http::PaginatedResponse, models::post::Post, state::AppState};

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/posts/creator/:creator_id", get(list_creator_posts))
}

#[derive(Deserialize)]
pub struct Pagination {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

async fn list_creator_posts(
    State(state): State<AppState>,
    axum::extract::Path(creator_id): axum::extract::Path<uuid::Uuid>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<PaginatedResponse<Post>>, AppError> {
    let page = pagination.page.unwrap_or(1);
    let limit = pagination.limit.unwrap_or(10);
    let offset = (page - 1) * limit;

    let posts = sqlx::query_as!(
        Post,
        r#"
        SELECT
            id,
            title,
            content,
            excerpt,
            images,
            "videoUrl",
            attachments,
            "isPublic",
            "minimumTierId",
            published,
            "publishedAt",
            "authorId",
            "createdAt",
            "updatedAt"
        FROM creator_posts
        WHERE "authorId" = $1 AND published = true AND "isPublic" = true
        ORDER BY "publishedAt" DESC
        LIMIT $2 OFFSET $3
        "#,
        creator_id,
        limit,
        offset
    )
    .fetch_all(&state.pool)
    .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM creator_posts WHERE \"authorId\" = $1 AND published = true AND \"isPublic\" = true")
        .bind(creator_id)
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(PaginatedResponse::new(posts, page, limit, total)))
}

