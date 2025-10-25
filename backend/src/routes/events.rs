use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::database::Database;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: chrono::DateTime<chrono::Utc>,
    pub location: Option<String>,
    pub price: Option<f64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub host_id: String,
    pub host_name: Option<String>,
    pub host_avatar: Option<String>,
    pub rsvp_count: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct EventQuery {
    pub upcoming: Option<bool>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub hostId: Option<String>,
}

pub fn event_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_events))
        .route("/:id", get(get_event_by_id))
}

async fn get_events(
    State(db): State<Database>,
    Query(params): Query<EventQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(12);
    let offset = (page - 1) * limit;
    let upcoming = params.upcoming.unwrap_or(false);
    let host_id = params.hostId.clone();

    // Use simple SQL query without JOIN first
    let query = if let Some(ref host_id) = host_id {
        if upcoming {
            "SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.location, e.price, e.created_at, e.updated_at, e.host_id, 'Host' as host_name, NULL as host_avatar, 0 as rsvp_count FROM events e WHERE e.host_id = $1 AND e.start_time > NOW() ORDER BY e.start_time ASC LIMIT $2 OFFSET $3"
        } else {
            "SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.location, e.price, e.created_at, e.updated_at, e.host_id, 'Host' as host_name, NULL as host_avatar, 0 as rsvp_count FROM events e WHERE e.host_id = $1 ORDER BY e.start_time DESC LIMIT $2 OFFSET $3"
        }
    } else {
        if upcoming {
            "SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.location, e.price, e.created_at, e.updated_at, e.host_id, 'Host' as host_name, NULL as host_avatar, 0 as rsvp_count FROM events e WHERE e.start_time > NOW() ORDER BY e.start_time ASC LIMIT $1 OFFSET $2"
        } else {
            "SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.location, e.price, e.created_at, e.updated_at, e.host_id, 'Host' as host_name, NULL as host_avatar, 0 as rsvp_count FROM events e ORDER BY e.start_time DESC LIMIT $1 OFFSET $2"
        }
    };
    
    let result = if let Some(host_id) = host_id {
        sqlx::query_as::<_, Event>(query)
            .bind(host_id)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&db.pool)
            .await
    } else {
        sqlx::query_as::<_, Event>(query)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&db.pool)
            .await
    };
    
    match result
    {
        Ok(events) => {
            // Frontend'in beklediği format
            let response = serde_json::json!({
                "success": true,
                "data": events,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": events.len(),
                    "pages": 1
                }
            });
            Ok(Json(response))
        },
        Err(e) => {
            tracing::error!("Failed to fetch events: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_event_by_id(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let query = "SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.location, e.price, e.created_at, e.updated_at, e.host_id, 'Host' as host_name, NULL as host_avatar, 0 as rsvp_count FROM events e WHERE e.id = $1";
    
    match sqlx::query_as::<_, Event>(query)
        .bind(&id)
        .fetch_one(&db.pool)
        .await
    {
        Ok(event) => {
            let response = serde_json::json!({
                "success": true,
                "data": event
            });
            Ok(Json(response))
        },
        Err(sqlx::Error::RowNotFound) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to fetch event {}: {}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
