use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{postgres::PgRow, Postgres, QueryBuilder, Row};
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

const DEFAULT_EVENT_COVER: &str =
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventQuery {
    pub upcoming: Option<bool>,
    pub past: Option<bool>,
    pub status: Option<String>,
    pub page: Option<u32>,
    #[serde(alias = "pageSize")]
    pub limit: Option<u32>,
    #[serde(alias = "hostId")]
    pub host_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EventHost {
    pub id: String,
    pub name: Option<String>,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EventCounts {
    pub rsvps: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EventResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub status: String,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: chrono::DateTime<chrono::Utc>,
    pub timezone: Option<String>,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub cover_image: String,
    pub max_attendees: Option<i32>,
    pub is_public: bool,
    pub is_premium: bool,
    pub price: f64,
    pub agenda: Option<String>,
    pub tags: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub host_id: String,
    pub host_name: Option<String>,
    pub host_avatar: Option<String>,
    pub host: Option<EventHost>,
    pub rsvp_count: i64,
    pub _count: EventCounts,
}

impl EventResponse {
    fn from_row(row: &PgRow) -> Self {
        let id: Uuid = row.get("id");
        let title: String = row.get("title");
        let description: Option<String> = row.try_get("description").unwrap_or(None);
        let status: String = row.get("status");
        let start_time: chrono::DateTime<chrono::Utc> = row.get("start_time");
        let end_time: chrono::DateTime<chrono::Utc> = row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("end_time")
            .unwrap_or(None)
            .unwrap_or(start_time);
        let timezone: Option<String> = row.try_get("timezone").unwrap_or(None);
        let location: Option<String> = row.try_get("location").unwrap_or(None);
        let virtual_link: Option<String> = row.try_get("virtual_link").unwrap_or(None);
        let cover_image = row
            .try_get::<Option<String>, _>("cover_image")
            .unwrap_or(None)
            .filter(|url| !url.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_EVENT_COVER.to_string());
        let max_attendees: Option<i32> = row.try_get("max_attendees").unwrap_or(None);
        let is_public: bool = row
            .try_get::<Option<bool>, _>("is_public")
            .unwrap_or(Some(true))
            .unwrap_or(true);
        let is_premium: bool = row
            .try_get::<Option<bool>, _>("is_premium")
            .unwrap_or(Some(false))
            .unwrap_or(false);
        let price: f64 = row
            .try_get::<Option<f64>, _>("price")
            .unwrap_or(Some(0.0))
            .unwrap_or(0.0);
        let agenda: Option<String> = row.try_get("agenda").unwrap_or(None);
        let tags: Vec<String> = row
            .try_get::<Option<Vec<String>>, _>("tags")
            .unwrap_or(None)
            .unwrap_or_default();
        let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
        let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
        let host_id: String = row.get("host_id");
        let host_name: Option<String> = row.try_get("host_name").unwrap_or(None);
        let host_username: Option<String> = row.try_get("host_username").unwrap_or(None);
        let host_avatar: Option<String> = row.try_get("host_avatar").unwrap_or(None);
        let rsvp_count: i64 = row
            .try_get::<Option<i64>, _>("rsvp_count")
            .unwrap_or(Some(0))
            .unwrap_or(0);
        let event_type = row
            .try_get::<Option<String>, _>("event_type")
            .unwrap_or(None)
            .unwrap_or_else(|| "VIRTUAL".to_string());

        let host = if host_name.is_some() || host_username.is_some() || host_avatar.is_some() {
            Some(EventHost {
                id: host_id.clone(),
                name: host_name.clone(),
                username: host_username,
                avatar: host_avatar.clone(),
            })
        } else {
            None
        };

        EventResponse {
            id,
            title,
            description,
            event_type,
            status,
            start_time,
            end_time,
            timezone,
            location,
            virtual_link,
            cover_image,
            max_attendees,
            is_public,
            is_premium,
            price,
            agenda,
            tags,
            created_at,
            updated_at,
            host_id,
            host_name,
            host_avatar,
            host,
            rsvp_count,
            _count: EventCounts { rsvps: rsvp_count },
        }
    }
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
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(12).max(1);
    let offset = (page - 1) * limit;
    let upcoming = params.upcoming.unwrap_or(false);
    let past = params.past.unwrap_or(false);
    let status = params.status.clone();
    let host_id = params.host_id.clone();

    let mut count_builder = QueryBuilder::<Postgres>::new("SELECT COUNT(*)::BIGINT FROM events e");
    let mut has_count_filter = false;
    if let Some(ref host_id) = host_id {
        count_builder
            .push(if has_count_filter { " AND " } else { " WHERE " })
            .push("e.host_id = ")
            .push_bind(host_id);
        has_count_filter = true;
    }
    if upcoming && !past {
        count_builder
            .push(if has_count_filter { " AND " } else { " WHERE " })
            .push("e.start_time >= NOW()");
        has_count_filter = true;
    }
    if past && !upcoming {
        count_builder
            .push(if has_count_filter { " AND " } else { " WHERE " })
            .push("e.start_time < NOW()");
        has_count_filter = true;
    }
    if let Some(ref status) = status {
        count_builder
            .push(if has_count_filter { " AND " } else { " WHERE " })
            .push("e.status = ")
            .push_bind(status);
        has_count_filter = true;
    }

    let total_row = count_builder
        .build()
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count events: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    let total_items: i64 = total_row.get::<i64, _>(0);

    let mut list_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e.status,
            e.event_type,
            e.cover_image,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.max_attendees,
            e.is_public,
            e.is_premium,
            e.price,
            e.agenda,
            e.tags,
            e.created_at,
            e.updated_at,
            e.host_id,
            u.display_name AS host_name,
            u.username AS host_username,
            u.avatar_url AS host_avatar,
            NULL::BIGINT AS rsvp_count
        FROM events e
        LEFT JOIN users u ON e.host_id = u.id
        "#,
    );

    let mut has_list_filter = false;
    if let Some(ref host_id) = host_id {
        list_builder
            .push(if has_list_filter { " AND " } else { " WHERE " })
            .push("e.host_id = ")
            .push_bind(host_id);
        has_list_filter = true;
    }
    if upcoming && !past {
        list_builder
            .push(if has_list_filter { " AND " } else { " WHERE " })
            .push("e.start_time >= NOW()");
        has_list_filter = true;
    }
    if past && !upcoming {
        list_builder
            .push(if has_list_filter { " AND " } else { " WHERE " })
            .push("e.start_time < NOW()");
        has_list_filter = true;
    }
    if let Some(ref status) = status {
        list_builder
            .push(if has_list_filter { " AND " } else { " WHERE " })
            .push("e.status = ")
            .push_bind(status);
        has_list_filter = true;
    }

    list_builder.push(" ORDER BY e.start_time ");
    if upcoming {
        list_builder.push("ASC");
    } else {
        list_builder.push("DESC");
    }
    list_builder
        .push(" LIMIT ")
        .push_bind(limit as i64)
        .push(" OFFSET ")
        .push_bind(offset as i64);

    let rows = list_builder
        .build()
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch events: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let events: Vec<EventResponse> = rows.iter().map(EventResponse::from_row).collect();
    let total_pages = ((total_items as f64) / (limit as f64)).ceil() as i64;

    Ok(Json(json!({
        "success": true,
        "data": events,
        "pagination": {
            "page": page,
            "pageSize": limit,
            "totalItems": total_items,
            "totalPages": total_pages.max(1)
        }
    })))
}

async fn get_event_by_id(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let query = r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e.status,
            e.event_type,
            e.cover_image,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.max_attendees,
            e.is_public,
            e.is_premium,
            e.price,
            e.agenda,
            e.tags,
            e.created_at,
            e.updated_at,
            e.host_id,
            u.display_name AS host_name,
            u.username AS host_username,
            u.avatar_url AS host_avatar,
            NULL::BIGINT AS rsvp_count
        FROM events e
        LEFT JOIN users u ON e.host_id = u.id
        WHERE e.id = $1
        LIMIT 1
    "#;

    match sqlx::query(query).bind(&id).fetch_optional(&db.pool).await {
        Ok(Some(row)) => Ok(Json(json!({
            "success": true,
            "data": EventResponse::from_row(&row)
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
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

    let query = r#"
        WITH inserted AS (
            INSERT INTO events (
                id,
                host_id,
                title,
                description,
                status,
                event_type,
                cover_image,
                start_time,
                end_time,
                timezone,
                location,
                virtual_link,
                max_attendees,
                is_public,
                is_premium,
                price,
                agenda,
                tags,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17, NOW(), NOW()
            )
            RETURNING
                id,
                title,
                description,
                status,
                event_type,
                cover_image,
                start_time,
                end_time,
                timezone,
                location,
                virtual_link,
                max_attendees,
                is_public,
                is_premium,
                price,
                agenda,
                tags,
                created_at,
                updated_at,
                host_id
        )
        SELECT
            inserted.id,
            inserted.title,
            inserted.description,
            inserted.status,
            inserted.event_type,
            inserted.cover_image,
            inserted.start_time,
            inserted.end_time,
            inserted.timezone,
            inserted.location,
            inserted.virtual_link,
            inserted.max_attendees,
            inserted.is_public,
            inserted.is_premium,
            inserted.price,
            inserted.agenda,
            inserted.tags,
            inserted.created_at,
            inserted.updated_at,
            inserted.host_id,
            u.display_name AS host_name,
            u.username AS host_username,
            u.avatar_url AS host_avatar,
            NULL::BIGINT AS rsvp_count
        FROM inserted
        LEFT JOIN users u ON inserted.host_id = u.id
    "#;

    let row = sqlx::query(query)
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

    Ok(Json(json!({
        "success": true,
        "data": EventResponse::from_row(&row)
    })))
}
