use axum::{extract::Query, routing::get, Json, Router};
use serde::Deserialize;
use serde_json::json;
use tracing::instrument;
use uuid::Uuid;

use crate::{error::AppError, models::event::EventSummary, state::AppState};

#[derive(Debug, Deserialize)]
struct EventQuery {
    host_id: Option<Uuid>,
    page: Option<usize>,
    limit: Option<usize>,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_events))
}

#[instrument(skip(state))]
async fn list_events(
    state: axum::extract::State<AppState>,
    Query(query): Query<EventQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(10).clamp(1, 50);
    let offset = (page - 1) * limit;

    let mut builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e."coverImage" AS cover_image,
            e.status,
            e."eventType" AS event_type,
            e."startTime" AS start_time,
            e."endTime" AS end_time,
            e.location,
            e."virtualLink" AS virtual_link,
            e.price,
            NULL::jsonb AS metadata
        FROM "Event" e
        WHERE e.status = 'PUBLISHED'
        "#,
    );

    if let Some(host_id) = query.host_id {
        builder.push(" AND e.\"hostId\" = ");
        builder.push_bind(host_id);
    }

    builder.push(" ORDER BY e.\"startTime\" DESC LIMIT ");
    builder.push_bind(limit as i64);
    builder.push(" OFFSET ");
    builder.push_bind(offset as i64);

    let events: Vec<EventSummary> = builder.build_query_as().fetch_all(&state.pool).await?;

    let mut count_builder = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT COUNT(*) FROM \"Event\" e WHERE e.status = 'PUBLISHED'",
    );

    if let Some(host_id) = query.host_id {
        count_builder.push(" AND e.\"hostId\" = ");
        count_builder.push_bind(host_id);
    }

    let total: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "events": events,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total as f64 / limit as f64).ceil() as i64,
            }
        }
    })))
}
