use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::{auth::Claims, database::Database};

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
    pub event_type: Option<String>,
    pub cover_image: Option<String>,
    pub timezone: Option<String>,
    pub virtual_link: Option<String>,
    pub max_attendees: Option<i32>,
    pub is_public: Option<bool>,
    pub is_premium: Option<bool>,
    pub agenda: Option<String>,
    pub tags: Option<Vec<String>>,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateEventRequest {
    pub title: String,
    pub description: String,
    #[serde(default, rename = "type")]
    pub type_field: Option<String>,
    pub status: Option<String>,
    pub start_time: String,
    pub end_time: Option<String>,
    pub timezone: Option<String>,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub max_attendees: Option<i32>,
    pub is_public: Option<bool>,
    pub is_premium: Option<bool>,
    pub price: Option<f64>,
    pub cover_image: Option<String>,
    pub agenda: Option<String>,
    pub tags: Option<Vec<String>>,
}

impl CreateEventRequest {
    fn event_type(&self) -> String {
        self.type_field
            .clone()
            .unwrap_or_else(|| "VIRTUAL".to_string())
    }
}

pub fn event_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_events).post(create_event))
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

    match result {
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
        }
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
        }
        Err(sqlx::Error::RowNotFound) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to fetch event {}: {}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn create_event(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<CreateEventRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let start_time = chrono::DateTime::parse_from_rfc3339(&payload.start_time)
        .map_err(|_| StatusCode::BAD_REQUEST)?
        .with_timezone(&chrono::Utc);

    let end_time = match payload.end_time.as_ref() {
        Some(raw) => Some(
            chrono::DateTime::parse_from_rfc3339(raw)
                .map_err(|_| StatusCode::BAD_REQUEST)?
                .with_timezone(&chrono::Utc),
        ),
        None => None,
    };

    let event = sqlx::query_as::<_, Event>(
        r#"
        INSERT INTO events (
            id, host_id, title, description, status, event_type, cover_image, start_time, end_time,
            timezone, location, virtual_link, max_attendees, is_public, is_premium, price, agenda, tags,
            created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $17,
            NOW(), NOW()
        )
        RETURNING 
            id,
            title,
            description,
            status,
            start_time,
            COALESCE(end_time, start_time) as end_time,
            location,
            price,
            event_type,
            cover_image,
            timezone,
            virtual_link,
            max_attendees,
            is_public,
            is_premium,
            agenda,
            tags,
            created_at,
            updated_at,
            host_id,
            NULL::TEXT as host_name,
            NULL::TEXT as host_avatar,
            NULL::INTEGER as rsvp_count
        "#
    )
    .bind(&claims.sub)
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(
        payload
            .status
            .clone()
            .unwrap_or_else(|| "PUBLISHED".to_string()),
    )
    .bind(payload.event_type())
    .bind(payload.cover_image.clone())
    .bind(start_time)
    .bind(end_time)
    .bind(payload.timezone.clone())
    .bind(payload.location.clone())
    .bind(payload.virtual_link.clone())
    .bind(payload.max_attendees)
    .bind(payload.is_public.unwrap_or(true))
    .bind(payload.is_premium.unwrap_or(false))
    .bind(payload.price.unwrap_or(0.0))
    .bind(payload.agenda.clone())
    .bind(payload.tags.clone())
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create event: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let response = serde_json::json!({
        "success": true,
        "data": event
    });

    Ok(Json(response))
}
