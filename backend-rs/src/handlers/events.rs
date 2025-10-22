use axum::{
    extract::{Json, Path, Query, State},
    Extension,
};
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Postgres, QueryBuilder, Row};
use uuid::Uuid;

use crate::{
    middleware::auth::AuthUser,
    utils::{
        app_state::AppState,
        error::{AppError, AppResult},
        response::ApiResponse,
    },
};

#[derive(Debug, Deserialize)]
pub struct ListEventsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    #[serde(rename = "type")]
    pub event_type: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "hostId")]
    pub host_id: Option<String>,
    pub upcoming: Option<bool>,
    pub past: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

#[derive(Debug, Serialize)]
pub struct EventHost {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
    pub username: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EventCounts {
    pub rsvps: i64,
}

#[derive(Debug, Serialize)]
pub struct EventItem {
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub status: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
    pub timezone: String,
    pub location: Option<String>,
    #[serde(rename = "virtualLink")]
    pub virtual_link: Option<String>,
    #[serde(rename = "maxAttendees")]
    pub max_attendees: Option<i32>,
    #[serde(rename = "isPublic")]
    pub is_public: bool,
    #[serde(rename = "isPremium")]
    pub is_premium: bool,
    pub price: f64,
    pub agenda: Option<String>,
    pub tags: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub host: EventHost,
    #[serde(rename = "_count")]
    pub _count: EventCounts,
    #[serde(rename = "userRSVPStatus", skip_serializing_if = "Option::is_none")]
    pub user_rsvp_status: Option<String>,
    #[serde(rename = "userRSVPIsPaid", skip_serializing_if = "Option::is_none")]
    pub user_rsvp_is_paid: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct EventListResponse {
    pub events: Vec<EventItem>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, FromRow)]
struct EventRow {
    id: String,
    title: String,
    description: String,
    cover_image: Option<String>,
    event_type: String,
    status: String,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    timezone: String,
    location: Option<String>,
    virtual_link: Option<String>,
    max_attendees: Option<i32>,
    is_public: bool,
    is_premium: bool,
    price: Option<f64>,
    agenda: Option<String>,
    tags: Option<Vec<String>>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
    host_id: String,
    host_name: String,
    host_avatar: Option<String>,
    host_username: Option<String>,
    rsvp_count: i64,
}

fn format_datetime(value: NaiveDateTime) -> String {
    DateTime::<Utc>::from_naive_utc_and_offset(value, Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub async fn list_events(
    State(state): State<AppState>,
    Query(params): Query<ListEventsQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    const ALLOWED_STATUS: &[&str] = &["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"];
    const ALLOWED_TYPES: &[&str] = &["VIRTUAL", "IN_PERSON", "HYBRID"];

    let status_param = params.status.as_ref().map(|s| s.trim().to_uppercase());
    let status_filter = match status_param.as_deref() {
        Some("ALL") => None,
        Some(value) if ALLOWED_STATUS.contains(&value) => Some(value.to_string()),
        Some(_) => Some("PUBLISHED".to_string()),
        None => Some("PUBLISHED".to_string()),
    };

    let type_param = params.event_type.as_ref().map(|s| s.trim().to_uppercase());
    let type_filter = match type_param.as_deref() {
        Some(value) if ALLOWED_TYPES.contains(&value) => Some(value.to_string()),
        _ => None,
    };

    let mut qb = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e."coverImage" AS cover_image,
            e.type::text AS event_type,
            e.status::text AS status,
            e."startTime" AS start_time,
            e."endTime" AS end_time,
            e.timezone,
            e.location,
            e."virtualLink" AS virtual_link,
            e."maxAttendees" AS max_attendees,
            e."isPublic" AS is_public,
            e."isPremium" AS is_premium,
            e.price,
            e.agenda,
            e.tags,
            e."createdAt" AS created_at,
            e."updatedAt" AS updated_at,
            u.id AS host_id,
            u.name AS host_name,
            u.avatar AS host_avatar,
            u.username AS host_username,
            COALESCE(COUNT(r.id), 0) AS rsvp_count
        FROM "Event" e
        LEFT JOIN "User" u ON u.id = e."hostId"
        LEFT JOIN "EventRSVP" r ON r."eventId" = e.id
        WHERE 1=1
        "#,
    );

    if let Some(status_value) = status_filter.as_ref() {
        qb.push(" AND e.status::text = ").push_bind(status_value);
    }

    if let Some(type_value) = type_filter.as_ref() {
        qb.push(" AND e.type = ").push_bind(type_value);
    }

    if let Some(ref host_id) = params.host_id {
        qb.push(" AND e.\"hostId\" = ").push_bind(host_id);
    }

    if params.upcoming.unwrap_or(false) {
        qb.push(" AND e.\"startTime\" >= NOW()");
    }

    if params.past.unwrap_or(false) {
        qb.push(" AND e.\"endTime\" < NOW()");
    }

    qb.push(" GROUP BY e.id, u.id ORDER BY e.\"startTime\" ASC, e.\"createdAt\" DESC LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);

    let rows: Vec<EventRow> = qb.build_query_as().fetch_all(&state.db).await?;

    let mut count_qb = QueryBuilder::<Postgres>::new(
        r#"SELECT COUNT(*)::BIGINT AS total FROM "Event" e WHERE 1=1"#,
    );

    if let Some(status_value) = status_filter.as_ref() {
        count_qb
            .push(" AND e.status::text = ")
            .push_bind(status_value);
    }

    if let Some(type_value) = type_filter.as_ref() {
        count_qb.push(" AND e.type = ").push_bind(type_value);
    }

    if let Some(ref host_id) = params.host_id {
        count_qb.push(" AND e.\"hostId\" = ").push_bind(host_id);
    }

    if params.upcoming.unwrap_or(false) {
        count_qb.push(" AND e.\"startTime\" >= NOW()");
    }

    if params.past.unwrap_or(false) {
        count_qb.push(" AND e.\"endTime\" < NOW()");
    }

    let total: i64 = count_qb.build_query_scalar().fetch_one(&state.db).await?;

    let pages = if total == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as i32
    };

    let events = rows
        .into_iter()
        .map(|row| EventItem {
            id: row.id,
            title: row.title,
            description: row.description,
            cover_image: row.cover_image,
            event_type: row.event_type,
            status: row.status,
            start_time: format_datetime(row.start_time),
            end_time: format_datetime(row.end_time),
            timezone: row.timezone,
            location: row.location,
            virtual_link: row.virtual_link,
            max_attendees: row.max_attendees,
            is_public: row.is_public,
            is_premium: row.is_premium,
            price: row.price.unwrap_or(0.0),
            agenda: row.agenda,
            tags: row.tags.unwrap_or_default(),
            created_at: format_datetime(row.created_at),
            updated_at: format_datetime(row.updated_at),
            host: EventHost {
                id: row.host_id,
                name: row.host_name,
                avatar: row.host_avatar,
                username: row.host_username,
            },
            _count: EventCounts {
                rsvps: row.rsvp_count,
            },
            user_rsvp_status: None,
            user_rsvp_is_paid: None,
        })
        .collect();

    let payload = EventListResponse {
        events,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages,
        },
    };

    Ok(ApiResponse::success(payload))
}

#[derive(Debug, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: String,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: Option<String>,
    pub location: Option<String>,
    #[serde(rename = "virtualLink")]
    pub virtual_link: Option<String>,
    pub price: Option<i32>,
    #[serde(rename = "isPublic")]
    pub is_public: Option<bool>,
    #[serde(rename = "type")]
    pub event_type: Option<String>,
    pub status: Option<String>,
}

pub async fn create_event(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(data): Json<CreateEventRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    let host_id = auth_user.id.to_string();

    let event_id = uuid::Uuid::new_v4().to_string();
    let event_id_clone = event_id.clone();
    let start_time = chrono::DateTime::parse_from_rfc3339(&data.start_time)
        .map_err(|_| AppError::BadRequest("Invalid start time format".to_string()))?
        .naive_utc();

    let end_time = data
        .end_time
        .as_ref()
        .map(|t| chrono::DateTime::parse_from_rfc3339(t).map(|dt| dt.naive_utc()))
        .transpose()
        .map_err(|_| AppError::BadRequest("Invalid end time format".to_string()))?;

    let status = data.status.as_deref().unwrap_or("DRAFT");
    let event_type = data.event_type.as_deref().unwrap_or("ONLINE");
    let is_public = data.is_public.unwrap_or(true);

    let price_float = data.price.map(|p| p as f64).unwrap_or(0.0);

    sqlx::query(
        r#"
        INSERT INTO "Event" (
            id, title, description, "coverImage", "startTime", "endTime",
            location, "virtualLink", price, "isPublic", "isPremium", type,
            "hostId", timezone, tags, "maxAttendees", "minimumTierId", agenda,
            "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, 'IN_PERSON', $11, 'UTC', '{}', NULL, NULL, NULL, NOW(), NOW())
        "#
    )
    .bind(event_id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(&data.cover_image)
    .bind(start_time)
    .bind(end_time)
    .bind(&data.location)
    .bind(&data.virtual_link)
    .bind(price_float)
    .bind(is_public)
    .bind(host_id)
    .execute(&state.db)
    .await?;

    Ok(ApiResponse::success(serde_json::json!({
        "id": event_id_clone,
        "title": data.title,
        "status": status,
        "startTime": start_time.to_string(),
    })))
}

pub async fn get_event(
    State(state): State<AppState>,
    Path(id): Path<String>,
    maybe_user: Option<Extension<AuthUser>>,
) -> AppResult<impl axum::response::IntoResponse> {
    let row: Option<EventRow> = sqlx::query_as(
        r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e."coverImage" AS cover_image,
            e.type::text AS event_type,
            e.status::text AS status,
            e."startTime" AS start_time,
            e."endTime" AS end_time,
            e.timezone,
            e.location,
            e."virtualLink" AS virtual_link,
            e."maxAttendees" AS max_attendees,
            e."isPublic" AS is_public,
            e."isPremium" AS is_premium,
            e.price,
            e.agenda,
            e.tags,
            e."createdAt" AS created_at,
            e."updatedAt" AS updated_at,
            u.id AS host_id,
            u.name AS host_name,
            u.avatar AS host_avatar,
            u.username AS host_username,
            COALESCE(COUNT(r.id), 0) AS rsvp_count
        FROM "Event" e
        LEFT JOIN "User" u ON u.id = e."hostId"
        LEFT JOIN "EventRSVP" r ON r."eventId" = e.id
        WHERE e.id = $1
        GROUP BY e.id, u.id
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

    let event_id = row.id.clone();

    let mut user_rsvp_status: Option<String> = None;
    let mut user_rsvp_is_paid: Option<bool> = None;

    if let Some(Extension(user)) = maybe_user {
        if let Some(rsvp_row) = sqlx::query(
            r#"SELECT status::text AS status, "isPaid" AS is_paid FROM "EventRSVP" WHERE "eventId" = $1 AND "userId" = $2 LIMIT 1"#,
        )
        .bind(&event_id)
        .bind(user.id)
        .fetch_optional(&state.db)
        .await?
        {
            let status: String = rsvp_row.get("status");
            let is_paid: bool = rsvp_row.get("is_paid");
            user_rsvp_status = Some(status);
            user_rsvp_is_paid = Some(is_paid);
        }
    }

    let EventRow {
        id: _,
        title,
        description,
        cover_image,
        event_type,
        status,
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
        host_id,
        host_name,
        host_avatar,
        host_username,
        rsvp_count,
    } = row;

    let event = EventItem {
        id: event_id,
        title,
        description,
        cover_image,
        event_type,
        status,
        start_time: format_datetime(start_time),
        end_time: format_datetime(end_time),
        timezone,
        location,
        virtual_link,
        max_attendees,
        is_public,
        is_premium,
        price: price.unwrap_or(0.0),
        agenda,
        tags: tags.unwrap_or_default(),
        created_at: format_datetime(created_at),
        updated_at: format_datetime(updated_at),
        host: EventHost {
            id: host_id,
            name: host_name,
            avatar: host_avatar,
            username: host_username,
        },
        _count: EventCounts { rsvps: rsvp_count },
        user_rsvp_status,
        user_rsvp_is_paid,
    };

    Ok(ApiResponse::success(event))
}

pub async fn rsvp_event(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("RSVP event - TODO"))
}
