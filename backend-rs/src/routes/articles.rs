use axum::{extract::Query, routing::get, Json, Router};
use serde::Deserialize;
use serde_json::json;
use tracing::instrument;
use uuid::Uuid;

use crate::{error::AppError, models::article::ArticleSummary, state::AppState};

#[derive(Debug, Deserialize)]
struct ArticleQuery {
    author_id: Option<Uuid>,
    page: Option<usize>,
    limit: Option<usize>,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_articles))
}

#[instrument(skip(state))]
async fn list_articles(
    state: axum::extract::State<AppState>,
    Query(query): Query<ArticleQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(10).clamp(1, 50);
    let offset = (page - 1) * limit;

    let mut builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        r#"
        SELECT
            a.id,
            a.slug,
            a.title,
            a.excerpt,
            a."coverImage" AS cover_image,
            a.status,
            a."publishedAt" AS published_at,
            a."viewCount" AS view_count,
            a."readTime" AS read_time,
            NULL::jsonb AS metadata
        FROM "Article" a
        WHERE a.status = 'PUBLISHED'
        "#,
    );

    if let Some(author_id) = query.author_id {
        builder.push(" AND a.\"authorId\" = ");
        builder.push_bind(author_id);
    }

    builder.push(" ORDER BY a.\"publishedAt\" DESC LIMIT ");
    builder.push_bind(limit as i64);
    builder.push(" OFFSET ");
    builder.push_bind(offset as i64);

    let articles: Vec<ArticleSummary> = builder.build_query_as().fetch_all(&state.pool).await?;

    let mut count_builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT COUNT(*) FROM \"Article\" a WHERE a.status = 'PUBLISHED'",
    );

    if let Some(author_id) = query.author_id {
        count_builder.push(" AND a.\"authorId\" = ");
        count_builder.push_bind(author_id);
    }

    let total: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "articles": articles,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total as f64 / limit as f64).ceil() as i64,
            }
        }
    })))
}
