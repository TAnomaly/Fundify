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

use crate::{auth::Claims, database::Database, middleware::optional_auth::MaybeClaims};

// Redis cache keys
const CACHE_TTL_EVENT_LIST: usize = 60; // 1 minute for list
const CACHE_TTL_EVENT_DETAIL: usize = 300; // 5 minutes for detail
const CACHE_TTL_RSVP_COUNT: usize = 30; // 30 seconds for RSVP count

fn event_list_cache_key(page: u32, limit: u32, upcoming: bool, past: bool, status: &Option<String>, host_id: &Option<String>) -> String {
    format!(
        "events:list:{}:{}:{}:{}:{}:{}",
        page,
        limit,
        upcoming,
        past,
        status.as_deref().unwrap_or("all"),
        host_id.as_deref().unwrap_or("all")
    )
}

fn event_detail_cache_key(event_id: &str) -> String {
    format!("event:detail:{}", event_id)
}

fn event_rsvp_count_cache_key(event_id: &str) -> String {
    format!("event:rsvp_count:{}", event_id)
}

async fn invalidate_event_cache(db: &Database, event_id: &str) {
    if let Some(redis) = &db.redis {
        let mut redis_clone = redis.clone();
        // Invalidate event detail cache
        let _ = redis_clone.del(&event_detail_cache_key(event_id)).await;
        // Invalidate RSVP count cache
        let _ = redis_clone.del(&event_rsvp_count_cache_key(event_id)).await;
        // Invalidate all list caches (pattern match)
        let _ = redis_clone.del_pattern("events:list:*").await;
    }
}

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
    #[serde(alias = "hostUsername")]
    pub host_username: Option<String>,
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
    pub id: String,
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
    pub host_username: Option<String>,
    pub host_avatar: Option<String>,
    pub host: Option<EventHost>,
    pub rsvp_count: i64,
    pub _count: EventCounts,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_rsvp_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_rsvp_is_paid: Option<bool>,
}

impl EventResponse {
    fn from_row(row: &PgRow) -> Self {
        let id: String = row
            .try_get::<Uuid, _>("id")
            .map(|uuid| uuid.to_string())
            .unwrap_or_else(|_| row.get::<String, _>("id"));
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
        let host_id: String = row
            .try_get::<Uuid, _>("host_id")
            .map(|uuid| uuid.to_string())
            .unwrap_or_else(|_| row.get::<String, _>("host_id"));
        let raw_host_name: Option<String> = row.try_get("host_name").unwrap_or(None);
        let host_username: Option<String> = row.try_get("host_username").unwrap_or(None);
        let host_display_name = raw_host_name.clone().or_else(|| host_username.clone());
        let host_avatar: Option<String> = row.try_get("host_avatar").unwrap_or(None);
        let rsvp_count: i64 = row
            .try_get::<Option<i64>, _>("rsvp_count")
            .unwrap_or(Some(0))
            .unwrap_or(0);
        let event_type = row
            .try_get::<Option<String>, _>("event_type")
            .unwrap_or(None)
            .unwrap_or_else(|| "VIRTUAL".to_string());
        let user_rsvp_status: Option<String> = row.try_get("user_rsvp_status").unwrap_or(None);
        let user_rsvp_is_paid: Option<bool> = row.try_get("user_rsvp_is_paid").unwrap_or(None);

        let host_username_clone = host_username.clone();
        let host =
            if host_display_name.is_some() || host_username.is_some() || host_avatar.is_some() {
                Some(EventHost {
                    id: host_id.clone(),
                    name: host_display_name.clone(),
                    username: host_username_clone,
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
            host_name: host_display_name,
            host_username,
            host_avatar,
            host,
            rsvp_count,
            _count: EventCounts { rsvps: rsvp_count },
            user_rsvp_status,
            user_rsvp_is_paid,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RsvpRequest {
    status: String,
    #[serde(default)]
    is_paid: Option<bool>,
}

async fn ensure_event_rsvps_table(db: &Database) -> Result<(), StatusCode> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS event_rsvps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            status VARCHAR(20) NOT NULL,
            is_paid BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_id, user_id)
        )
        "#,
    )
    .execute(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to ensure event_rsvps table exists: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if let Err(error) =
        sqlx::query("ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_event_id_fkey")
            .execute(&db.pool)
            .await
    {
        tracing::warn!("Unable to drop legacy event_id FK: {}", error);
    }

    if let Err(error) =
        sqlx::query("ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_user_id_fkey")
            .execute(&db.pool)
            .await
    {
        tracing::warn!("Unable to drop legacy user_id FK: {}", error);
    }

    if let Err(error) =
        sqlx::query("ALTER TABLE event_rsvps ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT")
            .execute(&db.pool)
            .await
    {
        tracing::warn!("Unable to align event_id column type: {}", error);
    }

    if let Err(error) =
        sqlx::query("ALTER TABLE event_rsvps ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT")
            .execute(&db.pool)
            .await
    {
        tracing::warn!("Unable to align user_id column type: {}", error);
    }

    if let Err(error) = sqlx::query("UPDATE event_rsvps SET status = UPPER(TRIM(status))")
        .execute(&db.pool)
        .await
    {
        tracing::warn!("Failed to normalize RSVP statuses: {}", error);
    }

    if let Err(error) = sqlx::query("UPDATE event_rsvps SET status = UPPER(status)")
        .execute(&db.pool)
        .await
    {
        tracing::warn!("Failed to normalize RSVP statuses: {}", error);
    }

    if let Err(error) =
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id)")
            .execute(&db.pool)
            .await
    {
        tracing::warn!("Failed to ensure event_rsvps event index: {}", error);
    }

    if let Err(error) =
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON event_rsvps(user_id)")
            .execute(&db.pool)
            .await
    {
        tracing::warn!("Failed to ensure event_rsvps user index: {}", error);
    }

    Ok(())
}

async fn handle_rsvp(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
    Json(payload): Json<RsvpRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    ensure_event_rsvps_table(&db).await?;
    let event_id = id.clone();
    let normalized_status = payload.status.trim().to_uppercase();

    if !["GOING", "MAYBE", "NOT_GOING"].contains(&normalized_status.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let event_exists = sqlx::query_scalar::<_, Option<String>>(
        "SELECT id::TEXT FROM events WHERE id::TEXT = $1 LIMIT 1",
    )
    .bind(&event_id)
    .fetch_optional(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to verify event {}: {}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if event_exists.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    if normalized_status == "NOT_GOING" {
        sqlx::query("DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2")
            .bind(&event_id)
            .bind(&claims.sub)
            .execute(&db.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to delete RSVP for event {}: {}", id, e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO event_rsvps (event_id, user_id, status, is_paid, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (event_id, user_id)
            DO UPDATE SET
                status = EXCLUDED.status,
                is_paid = EXCLUDED.is_paid,
                updated_at = NOW()
            "#,
        )
        .bind(&event_id)
        .bind(&claims.sub)
        .bind(&normalized_status)
        .bind(payload.is_paid.unwrap_or(false))
        .execute(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to upsert RSVP for event {}: {}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    let rsvp_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::BIGINT FROM event_rsvps WHERE event_id = $1 AND UPPER(TRIM(status)) = 'GOING'",
    )
    .bind(&event_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to count RSVPs for event {}: {}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let (user_status, user_is_paid) = if normalized_status == "NOT_GOING" {
        (None, None)
    } else {
        (
            Some(normalized_status.clone()),
            Some(payload.is_paid.unwrap_or(false)),
        )
    };

    // Ensure we hold the normalized status text back in the row for future queries
    if normalized_status != "NOT_GOING" {
        sqlx::query("UPDATE event_rsvps SET status = $1 WHERE event_id = $2 AND user_id = $3")
            .bind(&normalized_status)
            .bind(&event_id)
            .bind(&claims.sub)
            .execute(&db.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to persist normalized RSVP status: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
    }

    // Invalidate cache after RSVP change
    invalidate_event_cache(&db, &event_id).await;

    Ok(Json(json!({
        "success": true,
        "data": {
            "status": user_status,
            "isPaid": user_is_paid,
            "rsvpCount": rsvp_count
        }
    })))
}

pub fn event_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_events).post(create_event))
        .route("/:id", get(get_event_by_id))
        .route("/:id/ticket", get(get_event_ticket))
        .route("/:id/rsvp", post(handle_rsvp))
        .route("/:id/payment-intent", post(create_event_payment_intent))
        .route("/:id/complete-rsvp", post(complete_event_rsvp))
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
    let host_id_param = params.host_id.clone();
    let mut host_username_param = params.host_username.clone();
    if let (Some(ref host_id), Some(ref host_username)) = (&host_id_param, &host_username_param) {
        if host_id == host_username {
            host_username_param = None;
        }
    }

    ensure_event_rsvps_table(&db).await?;

    let mut count_builder = QueryBuilder::<Postgres>::new("SELECT COUNT(*)::BIGINT FROM events e");
    let mut has_count_filter = false;
    if let Some(ref host_id) = host_id_param {
        count_builder
            .push(if has_count_filter { " AND " } else { " WHERE " })
            .push("(")
            .push("e.host_id = ")
            .push_bind(host_id.as_str())
            .push(" OR EXISTS (SELECT 1 FROM users u WHERE u.id = e.host_id AND u.username = ")
            .push_bind(host_id.as_str())
            .push("))");
        has_count_filter = true;
    }
    if let Some(ref host_username) = host_username_param {
        count_builder
            .push(if has_count_filter { " AND " } else { " WHERE " })
            .push("EXISTS (SELECT 1 FROM users u WHERE u.id = e.host_id AND u.username = ")
            .push_bind(host_username.as_str())
            .push(")");
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
            COALESCE(rsvp_counts.count, 0) AS rsvp_count,
            NULL::TEXT AS user_rsvp_status,
            NULL::BOOLEAN AS user_rsvp_is_paid
        FROM events e
        LEFT JOIN users u ON e.host_id = u.id
        LEFT JOIN (
            SELECT event_id, COUNT(*)::BIGINT AS count
            FROM event_rsvps
            WHERE UPPER(TRIM(status)) = 'GOING'
            GROUP BY event_id
        ) rsvp_counts ON rsvp_counts.event_id = e.id::TEXT
        "#,
    );

    let mut has_list_filter = false;
    if let Some(ref host_id) = host_id_param {
        list_builder
            .push(if has_list_filter { " AND " } else { " WHERE " })
            .push("(")
            .push("e.host_id = ")
            .push_bind(host_id.as_str())
            .push(" OR COALESCE(u.username, '') = ")
            .push_bind(host_id.as_str())
            .push(")");
        has_list_filter = true;
    }
    if let Some(ref host_username) = host_username_param {
        list_builder
            .push(if has_list_filter { " AND " } else { " WHERE " })
            .push("COALESCE(u.username, '') = ")
            .push_bind(host_username.as_str());
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
    MaybeClaims(maybe_claims): MaybeClaims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let event_identifier = id.clone();

    ensure_event_rsvps_table(&db).await?;

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
            COALESCE(rsvp_counts.count, 0) AS rsvp_count,
            NULL::TEXT AS user_rsvp_status,
            NULL::BOOLEAN AS user_rsvp_is_paid
        FROM events e
        LEFT JOIN users u ON e.host_id = u.id
        LEFT JOIN (
            SELECT event_id, COUNT(*)::BIGINT AS count
            FROM event_rsvps
            WHERE UPPER(TRIM(status)) = 'GOING'
            GROUP BY event_id
        ) rsvp_counts ON rsvp_counts.event_id = e.id::TEXT
        WHERE e.id::TEXT = $1
        LIMIT 1
    "#;

    match sqlx::query(query)
        .bind(&event_identifier)
        .fetch_optional(&db.pool)
        .await
    {
        Ok(Some(row)) => {
            let mut event = EventResponse::from_row(&row);

            if let Some(claims) = maybe_claims {
                if let Ok(Some(rsvp_row)) = sqlx::query(
                    r#"
                    SELECT status, is_paid
                    FROM event_rsvps
                    WHERE event_id = $1 AND user_id = $2
                    "#,
                )
                .bind(&event_identifier)
                .bind(&claims.sub)
                .fetch_optional(&db.pool)
                .await
                {
                    let status: String = rsvp_row.get("status");
                    let is_paid: Option<bool> = rsvp_row.try_get("is_paid").unwrap_or(None);
                    event.user_rsvp_status = Some(status);
                    event.user_rsvp_is_paid = is_paid;
                }
            }

            Ok(Json(json!({
                "success": true,
                "data": event
            })))
        }
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to fetch event {}: {}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_event_ticket(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    ensure_event_rsvps_table(&db).await?;

    let event_identifier = id.clone();
    let user_id = claims.sub.clone();

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
            COALESCE(rsvp_counts.count, 0) AS rsvp_count,
            NULL::TEXT AS user_rsvp_status,
            NULL::BOOLEAN AS user_rsvp_is_paid
        FROM events e
        LEFT JOIN users u ON e.host_id = u.id
        LEFT JOIN (
            SELECT event_id, COUNT(*)::BIGINT AS count
            FROM event_rsvps
            WHERE UPPER(TRIM(status)) = 'GOING'
            GROUP BY event_id
        ) rsvp_counts ON rsvp_counts.event_id = e.id::TEXT
        WHERE e.id::TEXT = $1
        LIMIT 1
    "#;

    let event_row = sqlx::query(query)
        .bind(&event_identifier)
        .fetch_optional(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to load event {}: {}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let Some(row) = event_row else {
        return Err(StatusCode::NOT_FOUND);
    };

    let mut event = EventResponse::from_row(&row);

    let rsvp_row = sqlx::query(
        r#"
        SELECT status, is_paid
        FROM event_rsvps
        WHERE event_id = $1 AND user_id = $2
        "#,
    )
    .bind(&event_identifier)
    .bind(&user_id)
    .fetch_optional(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load RSVP for ticket {}: {}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let Some(rsvp_row) = rsvp_row else {
        return Err(StatusCode::FORBIDDEN);
    };

    let status: String = rsvp_row.get("status");
    let is_paid: bool = rsvp_row
        .try_get("is_paid")
        .unwrap_or(Some(false))
        .unwrap_or(false);

    if status.to_uppercase() != "GOING" {
        return Err(StatusCode::FORBIDDEN);
    }

    if event.price > 0.0 && !is_paid {
        return Err(StatusCode::FORBIDDEN);
    }

    event.user_rsvp_status = Some(status.to_uppercase());
    event.user_rsvp_is_paid = Some(is_paid);

    let host_name = event
        .host
        .as_ref()
        .and_then(|host| host.name.clone())
        .or(event.host_name.clone())
        .unwrap_or_else(|| "Event Organizer".to_string());

    let host_email = event
        .host
        .as_ref()
        .and_then(|host| host.username.clone())
        .or(event.host_username.clone())
        .unwrap_or_else(|| "organizer@fundify.com".to_string());

    let attendee_name = claims
        .name
        .clone()
        .or(claims.username.clone())
        .unwrap_or_else(|| "Guest Attendee".to_string());

    let attendee_email = claims.email.clone().unwrap_or_else(|| "".to_string());

    let short_event = event_identifier
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(6)
        .collect::<String>()
        .to_uppercase();
    let short_user = user_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(6)
        .collect::<String>()
        .to_uppercase();
    let ticket_code = format!("TCK-{}-{}", short_event, short_user);

    let event_json = json!({
        "id": event.id,
        "title": event.title,
        "startTime": event.start_time,
        "endTime": event.end_time,
        "location": event.location,
        "virtualLink": event.virtual_link,
        "type": event.event_type,
        "coverImage": event.cover_image,
        "host": {
            "name": host_name,
            "email": host_email,
        },
    });

    let ticket_json = json!({
        "id": format!("{}:{}", event_identifier, user_id.clone()),
        "ticketCode": ticket_code,
        "status": "GOING",
        "checkedIn": false,
        "checkedInAt": serde_json::Value::Null,
        "isPaid": is_paid,
        "event": event_json,
        "user": {
            "id": user_id,
            "name": attendee_name,
            "email": attendee_email,
            "avatar": serde_json::Value::Null,
        },
    });

    Ok(Json(json!({
        "success": true,
        "data": ticket_json
    })))
}

async fn create_event_payment_intent(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let event_identifier = id.clone();

    // Get the event to check price
    let event_row = sqlx::query(
        r#"
        SELECT id, title, price, is_premium
        FROM events
        WHERE id::TEXT = $1
        LIMIT 1
        "#,
    )
    .bind(&event_identifier)
    .fetch_optional(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load event {}: {}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let Some(row) = event_row else {
        return Err(StatusCode::NOT_FOUND);
    };

    let price: f64 = row.try_get("price").unwrap_or(0.0);
    let is_premium: bool = row.try_get("is_premium").unwrap_or(false);

    if price <= 0.0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Get Stripe secret key
    let stripe_secret = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if stripe_secret.trim().is_empty() {
        tracing::error!("Stripe secret key not configured");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // Create payment intent via Stripe API
    let amount_cents = (price * 100.0) as i64;
    let client = reqwest::Client::new();

    let params = [
        ("amount", amount_cents.to_string()),
        ("currency", "usd".to_string()),
        ("metadata[event_id]", event_identifier.clone()),
        ("metadata[user_id]", claims.sub.clone()),
        ("automatic_payment_methods[enabled]", "true".to_string()),
    ];

    let response = client
        .post("https://api.stripe.com/v1/payment_intents")
        .header("Authorization", format!("Bearer {}", stripe_secret))
        .form(&params)
        .send()
        .await
        .map_err(|err| {
            tracing::error!("Failed to create Stripe payment intent: {:?}", err);
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        tracing::error!("Stripe returned error: {}", body);
        return Err(StatusCode::BAD_GATEWAY);
    }

    let payment_intent: serde_json::Value = response.json().await.map_err(|err| {
        tracing::error!("Failed to parse Stripe response: {:?}", err);
        StatusCode::BAD_GATEWAY
    })?;

    let client_secret = payment_intent
        .get("client_secret")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            tracing::error!("No client_secret in Stripe response");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "clientSecret": client_secret
        }
    })))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompleteRsvpRequest {
    payment_intent_id: String,
}

async fn complete_event_rsvp(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
    Json(payload): Json<CompleteRsvpRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    ensure_event_rsvps_table(&db).await?;

    let event_identifier = id.clone();
    let user_id = claims.sub.clone();

    // Verify the payment with Stripe
    let stripe_secret = std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if stripe_secret.trim().is_empty() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let client = reqwest::Client::new();
    let response = client
        .get(format!(
            "https://api.stripe.com/v1/payment_intents/{}",
            payload.payment_intent_id
        ))
        .header("Authorization", format!("Bearer {}", stripe_secret))
        .send()
        .await
        .map_err(|err| {
            tracing::error!("Failed to verify payment intent: {:?}", err);
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        tracing::error!("Stripe returned error: {}", body);
        return Err(StatusCode::BAD_GATEWAY);
    }

    let payment_intent: serde_json::Value = response.json().await.map_err(|err| {
        tracing::error!("Failed to parse Stripe response: {:?}", err);
        StatusCode::BAD_GATEWAY
    })?;

    let payment_status = payment_intent
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();

    if payment_status != "succeeded" {
        tracing::error!("Payment not succeeded, status: {}", payment_status);
        return Err(StatusCode::PAYMENT_REQUIRED);
    }

    // Update or create RSVP with is_paid=true
    sqlx::query(
        r#"
        INSERT INTO event_rsvps (event_id, user_id, status, is_paid, created_at, updated_at)
        VALUES ($1, $2, 'GOING', true, NOW(), NOW())
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET
            status = 'GOING',
            is_paid = true,
            updated_at = NOW()
        "#,
    )
    .bind(&event_identifier)
    .bind(&user_id)
    .execute(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update RSVP after payment: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Get updated RSVP count
    let rsvp_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::BIGINT FROM event_rsvps WHERE event_id = $1 AND UPPER(TRIM(status)) = 'GOING'",
    )
    .bind(&event_identifier)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to count RSVPs: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Invalidate cache after payment completion
    invalidate_event_cache(&db, &event_identifier).await;

    // Send payment confirmation notification via AMQP
    if let Some(amqp) = &db.amqp {
        let price: f64 = sqlx::query_scalar("SELECT price FROM events WHERE id::TEXT = $1")
            .bind(&event_identifier)
            .fetch_optional(&db.pool)
            .await
            .unwrap_or(None)
            .unwrap_or(0.0);

        if let Err(e) = amqp.send_payment_confirmation(
            event_identifier.clone(),
            user_id.clone(),
            price,
        ).await {
            tracing::warn!("Failed to send payment confirmation notification: {}", e);
        }
    }

    Ok(Json(json!({
        "success": true,
        "data": {
            "status": "GOING",
            "isPaid": true,
            "rsvpCount": rsvp_count
        }
    })))
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
            0::BIGINT AS rsvp_count,
            NULL::TEXT AS user_rsvp_status,
            NULL::BOOLEAN AS user_rsvp_is_paid
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
