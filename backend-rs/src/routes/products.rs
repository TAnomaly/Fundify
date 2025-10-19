use axum::{extract::Query, routing::get, Json, Router};
use serde::Deserialize;
use serde_json::json;
use tracing::instrument;
use uuid::Uuid;

use crate::{error::AppError, models::product::DigitalProductSummary, state::AppState};

#[derive(Debug, Deserialize)]
struct ProductQuery {
    creator_id: Option<Uuid>,
    page: Option<usize>,
    limit: Option<usize>,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_products))
}

#[instrument(skip(state))]
async fn list_products(
    state: axum::extract::State<AppState>,
    Query(query): Query<ProductQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(12).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        r#"
        SELECT
            p.id,
            p.title,
            p.description,
            p.price,
            'USD' AS currency,
            p."isActive" AS is_active,
            p."coverImage" AS cover_image,
            p."fileUrl" AS download_url,
            p."createdAt" AS created_at,
            NULL::jsonb AS metadata
        FROM "DigitalProduct" p
        WHERE p."isActive" = TRUE
        "#,
    );

    if let Some(creator_id) = query.creator_id {
        builder.push(" AND p.\"creatorId\" = ");
        builder.push_bind(creator_id);
    }

    builder.push(" ORDER BY p.\"createdAt\" DESC LIMIT ");
    builder.push_bind(limit as i64);
    builder.push(" OFFSET ");
    builder.push_bind(offset as i64);

    let products: Vec<DigitalProductSummary> =
        builder.build_query_as().fetch_all(&state.pool).await?;

    let mut count_builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT COUNT(*) FROM \"DigitalProduct\" p WHERE p.\"isActive\" = TRUE",
    );

    if let Some(creator_id) = query.creator_id {
        count_builder.push(" AND p.\"creatorId\" = ");
        count_builder.push_bind(creator_id);
    }

    let total: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "products": products,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total as f64 / limit as f64).ceil() as i64,
            }
        }
    })))
}
