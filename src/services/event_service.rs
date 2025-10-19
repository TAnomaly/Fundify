use crate::error::AppError;
use crate::models::event::{
    EventDetail, EventDetailRow, EventHost, EventListResponse, EventPagination, EventRSVPResponse,
    EventReminderResponse, EventSummary, EventSummaryRow, EventTicketResponse,
};
use crate::state::AppState;
use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Row};
use uuid::Uuid;

const MAX_PAGE_LIMIT: u32 = 50;

#[derive(Debug, Clone)]
pub struct EventListFilters {
    pub status: Option<String>,
    pub host_id: Option<Uuid>,
    pub event_type: Option<String>,
    pub upcoming: bool,
    pub past: bool,
    pub search: Option<String>,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone)]
pub struct EventCreateInput {
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: String,
    pub status: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub timezone: Option<String>,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub max_attendees: Option<i32>,
    pub is_public: bool,
    pub is_premium: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub price_cents: i32,
    pub agenda: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct EventUpdateInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: Option<String>,
    pub status: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub timezone: Option<String>,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub max_attendees: Option<Option<i32>>,
    pub is_public: Option<bool>,
    pub is_premium: Option<bool>,
    pub minimum_tier_id: Option<Option<Uuid>>,
    pub price_cents: Option<i32>,
    pub agenda: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct RsvpInput {
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct EventReminderInput {
    pub reminder_at: DateTime<Utc>,
}

pub async fn list_events(
    state: &AppState,
    filters: EventListFilters,
    viewer: Option<Uuid>,
) -> Result<EventListResponse, AppError> {
    let page = filters.page.max(1);
    let limit = filters.limit.clamp(1, MAX_PAGE_LIMIT);
    let offset = ((page - 1) as i64) * (limit as i64);

    let mut builder = QueryBuilder::new(
        r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e.cover_image,
            e.event_type::text AS event_type,
            e.status::text AS status,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.is_public,
            e.is_premium,
            e.max_attendees,
            e.price_cents,
            u.id AS host_id,
            u.name AS host_name,
            u.username AS host_username,
            u.avatar AS host_avatar,
            COALESCE(r.going_count, 0) AS going_count
        FROM events e
        JOIN users u ON u.id = e.host_id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS going_count
            FROM event_rsvps er
            WHERE er.event_id = e.id AND er.status = 'GOING'
        ) r ON TRUE
        WHERE 1 = 1
        "#,
    );

    apply_event_filters(&mut builder, &filters);

    builder
        .push(" ORDER BY e.start_time ASC ")
        .push(" LIMIT ")
        .push_bind(limit as i64)
        .push(" OFFSET ")
        .push_bind(offset);

    let rows = builder
        .build_query_as::<EventSummaryRow>()
        .fetch_all(&state.db_pool)
        .await?;

    let events = rows
        .into_iter()
        .map(EventSummaryRow::into_summary)
        .collect();

    let mut count_builder =
        QueryBuilder::new("SELECT COUNT(*)::bigint AS total FROM events e WHERE 1 = 1");
    apply_event_filters(&mut count_builder, &filters);
    let total = count_builder
        .build()
        .fetch_one(&state.db_pool)
        .await?
        .get::<i64, _>("total");

    let pages = if total == 0 {
        0
    } else {
        ((total + (limit as i64) - 1) / (limit as i64)) as u32
    };

    // viewer parameter is reserved for future personalization (e.g., mark user's RSVP on list)
    let _ = viewer;

    Ok(EventListResponse {
        events,
        pagination: EventPagination {
            page,
            limit,
            total,
            pages,
        },
    })
}

pub async fn get_event_by_id(
    state: &AppState,
    event_id: Uuid,
    viewer: Option<Uuid>,
) -> Result<EventDetail, AppError> {
    let row = sqlx::query_as::<_, EventDetailRow>(
        r#"
        SELECT
            e.id,
            e.title,
            e.description,
            e.cover_image,
            e.event_type::text AS event_type,
            e.status::text AS status,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.max_attendees,
            e.is_public,
            e.is_premium,
            e.minimum_tier_id,
            e.price_cents,
            e.agenda,
            e.tags,
            e.created_at,
            e.updated_at,
            u.id AS host_id,
            u.name AS host_name,
            u.username AS host_username,
            u.avatar AS host_avatar,
            COALESCE(r.going_count, 0) AS going_count
        FROM events e
        JOIN users u ON u.id = e.host_id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS going_count
            FROM event_rsvps er
            WHERE er.event_id = e.id AND er.status = 'GOING'
        ) r ON TRUE
        WHERE e.id = $1
        LIMIT 1
        "#,
    )
    .bind(event_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(row) = row else {
        return Err(AppError::NotFound("Event not found".to_string()));
    };

    let (status, is_paid) = if let Some(viewer_id) = viewer {
        let rsvp = sqlx::query_as::<_, (String, bool)>(
            "SELECT status::text, is_paid FROM event_rsvps WHERE event_id = $1 AND user_id = $2",
        )
        .bind(event_id)
        .bind(viewer_id)
        .fetch_optional(&state.db_pool)
        .await?;

        match rsvp {
            Some((status, paid)) => (Some(status), paid),
            None => (None, false),
        }
    } else {
        (None, false)
    };

    Ok(row.into_detail(status, is_paid))
}

pub async fn create_event(
    state: &AppState,
    host_id: Uuid,
    input: EventCreateInput,
) -> Result<EventDetail, AppError> {
    let status = input.status.unwrap_or_else(|| "DRAFT".to_string());

    let event_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO events (
            id,
            host_id,
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
            minimum_tier_id,
            price_cents,
            agenda,
            tags
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::event_type,
            $7::event_status,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19
        )
        "#,
    )
    .bind(event_id)
    .bind(host_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.cover_image)
    .bind(&input.event_type)
    .bind(&status)
    .bind(input.start_time)
    .bind(input.end_time)
    .bind(input.timezone.unwrap_or_else(|| "UTC".to_string()))
    .bind(&input.location)
    .bind(&input.virtual_link)
    .bind(input.max_attendees)
    .bind(input.is_public)
    .bind(input.is_premium)
    .bind(input.minimum_tier_id)
    .bind(input.price_cents)
    .bind(&input.agenda)
    .bind(&input.tags)
    .execute(&state.db_pool)
    .await?;

    // use slug_base currently unused, keep for future
    get_event_by_id(state, event_id, Some(host_id)).await
}

pub async fn update_event(
    state: &AppState,
    event_id: Uuid,
    host_id: Uuid,
    mut input: EventUpdateInput,
) -> Result<EventDetail, AppError> {
    let mut builder = QueryBuilder::new("UPDATE events SET ");
    let mut separated = builder.separated(", ");
    let mut has_changes = false;

    if let Some(title) = input.title.take() {
        separated.push("title = ").push_bind(title);
        has_changes = true;
    }
    if let Some(description) = input.description.take() {
        separated.push("description = ").push_bind(description);
        has_changes = true;
    }
    if let Some(cover_image) = input.cover_image.take() {
        separated.push("cover_image = ").push_bind(cover_image);
        has_changes = true;
    }
    if let Some(event_type) = input.event_type.take() {
        separated
            .push("event_type = ")
            .push_bind(event_type)
            .push("::event_type");
        has_changes = true;
    }
    if let Some(status) = input.status.take() {
        separated
            .push("status = ")
            .push_bind(status)
            .push("::event_status");
        has_changes = true;
    }
    if let Some(start_time) = input.start_time.take() {
        separated.push("start_time = ").push_bind(start_time);
        has_changes = true;
    }
    if let Some(end_time) = input.end_time.take() {
        separated.push("end_time = ").push_bind(end_time);
        has_changes = true;
    }
    if let Some(timezone) = input.timezone.take() {
        separated.push("timezone = ").push_bind(timezone);
        has_changes = true;
    }
    if let Some(location) = input.location.take() {
        separated.push("location = ").push_bind(location);
        has_changes = true;
    }
    if let Some(virtual_link) = input.virtual_link.take() {
        separated.push("virtual_link = ").push_bind(virtual_link);
        has_changes = true;
    }
    if let Some(max_attendees) = input.max_attendees.take() {
        separated.push("max_attendees = ").push_bind(max_attendees);
        has_changes = true;
    }
    if let Some(is_public) = input.is_public {
        separated.push("is_public = ").push_bind(is_public);
        has_changes = true;
    }
    if let Some(is_premium) = input.is_premium {
        separated.push("is_premium = ").push_bind(is_premium);
        has_changes = true;
    }
    if let Some(minimum_tier_id) = input.minimum_tier_id.take() {
        separated
            .push("minimum_tier_id = ")
            .push_bind(minimum_tier_id);
        has_changes = true;
    }
    if let Some(price_cents) = input.price_cents {
        separated.push("price_cents = ").push_bind(price_cents);
        has_changes = true;
    }
    if let Some(agenda) = input.agenda.take() {
        separated.push("agenda = ").push_bind(agenda);
        has_changes = true;
    }
    if let Some(tags) = input.tags.take() {
        separated.push("tags = ").push_bind(tags);
        has_changes = true;
    }

    if !has_changes {
        return Err(AppError::Validation(vec![
            "No fields provided for update".to_string()
        ]));
    }

    separated.push("updated_at = NOW()");

    builder.push(" WHERE id = ").push_bind(event_id);
    builder.push(" AND host_id = ").push_bind(host_id);

    let result = builder.build().execute(&state.db_pool).await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Event not found".to_string()));
    }

    get_event_by_id(state, event_id, Some(host_id)).await
}

pub async fn delete_event(state: &AppState, event_id: Uuid, host_id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM events WHERE id = $1 AND host_id = $2")
        .bind(event_id)
        .bind(host_id)
        .execute(&state.db_pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Event not found".to_string()));
    }

    Ok(())
}

pub async fn upsert_rsvp(
    state: &AppState,
    event_id: Uuid,
    user_id: Uuid,
    input: RsvpInput,
) -> Result<EventRSVPResponse, AppError> {
    let status = input.status.to_ascii_uppercase();
    if !matches!(status.as_str(), "GOING" | "MAYBE" | "NOT_GOING") {
        return Err(AppError::Validation(
            vec!["Invalid RSVP status".to_string()],
        ));
    }

    // ensure event exists
    let event =
        sqlx::query_as::<_, (Option<i32>,)>("SELECT max_attendees FROM events WHERE id = $1")
            .bind(event_id)
            .fetch_optional(&state.db_pool)
            .await?;

    let Some((max_attendees,)) = event else {
        return Err(AppError::NotFound("Event not found".to_string()));
    };

    if status == "NOT_GOING" {
        sqlx::query("DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2")
            .bind(event_id)
            .bind(user_id)
            .execute(&state.db_pool)
            .await?;

        return Ok(EventRSVPResponse {
            id: Uuid::nil(),
            event_id,
            user_id,
            status,
            ticket_code: String::new(),
            is_paid: false,
            checked_in: false,
            checked_in_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    if status == "GOING" {
        if let Some(max) = max_attendees {
            let going_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*)::bigint FROM event_rsvps WHERE event_id = $1 AND status = 'GOING'",
            )
            .bind(event_id)
            .fetch_one(&state.db_pool)
            .await?;

            if going_count >= max as i64 {
                return Err(AppError::Validation(vec![
                    "Event is at full capacity".to_string()
                ]));
            }
        }
    }

    let ticket_code = Uuid::new_v4().to_string();

    let row = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            bool,
            bool,
            Option<DateTime<Utc>>,
            DateTime<Utc>,
            DateTime<Utc>,
            String,
        ),
    >(
        r#"
        INSERT INTO event_rsvps (id, event_id, user_id, status, ticket_code)
        VALUES ($1, $2, $3, $4::rsvp_status, $5)
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
        RETURNING id, status::text, is_paid, checked_in, checked_in_at, created_at, updated_at, ticket_code
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(event_id)
    .bind(user_id)
    .bind(&status)
    .bind(&ticket_code)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(EventRSVPResponse {
        id: row.0,
        event_id,
        user_id,
        status: row.1,
        ticket_code: row.7,
        is_paid: row.2,
        checked_in: row.3,
        checked_in_at: row.4,
        created_at: row.5,
        updated_at: row.6,
    })
}

pub async fn list_event_rsvps(
    state: &AppState,
    event_id: Uuid,
    status: Option<String>,
) -> Result<Vec<EventRSVPResponse>, AppError> {
    let rows = if let Some(status) = status {
        sqlx::query_as::<_, (Uuid, String, bool, bool, Option<DateTime<Utc>>, DateTime<Utc>, DateTime<Utc>, Uuid, String)>(
            r#"
            SELECT id, status::text, is_paid, checked_in, checked_in_at, created_at, updated_at, user_id, ticket_code
            FROM event_rsvps
            WHERE event_id = $1 AND status = $2::rsvp_status
            ORDER BY created_at DESC
            "#,
        )
        .bind(event_id)
        .bind(status)
        .fetch_all(&state.db_pool)
        .await?
    } else {
        sqlx::query_as::<_, (Uuid, String, bool, bool, Option<DateTime<Utc>>, DateTime<Utc>, DateTime<Utc>, Uuid, String)>(
            r#"
            SELECT id, status::text, is_paid, checked_in, checked_in_at, created_at, updated_at, user_id, ticket_code
            FROM event_rsvps
            WHERE event_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(event_id)
        .fetch_all(&state.db_pool)
        .await?
    };

    Ok(rows
        .into_iter()
        .map(|row| EventRSVPResponse {
            id: row.0,
            event_id,
            user_id: row.7,
            status: row.1,
            ticket_code: row.8,
            is_paid: row.2,
            checked_in: row.3,
            checked_in_at: row.4,
            created_at: row.5,
            updated_at: row.6,
        })
        .collect())
}

pub async fn get_event_ticket(
    state: &AppState,
    event_id: Uuid,
    user_id: Uuid,
) -> Result<EventTicketResponse, AppError> {
    let row = sqlx::query(
        r#"
        SELECT
            er.ticket_code,
            er.status::text AS rsvp_status,
            er.is_paid,
            er.checked_in,
            er.checked_in_at,
            e.id,
            e.title,
            e.description,
            e.cover_image,
            e.event_type::text AS event_type,
            e.status::text AS status,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.is_public,
            e.is_premium,
            e.max_attendees,
            e.price_cents,
            u.id AS host_id,
            u.name AS host_name,
            u.username AS host_username,
            u.avatar AS host_avatar
        FROM event_rsvps er
        JOIN events e ON e.id = er.event_id
        JOIN users u ON u.id = e.host_id
        WHERE er.event_id = $1 AND er.user_id = $2
        "#,
    )
    .bind(event_id)
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(row) = row else {
        return Err(AppError::NotFound("Event not found".to_string()));
    };

    let ticket_code: String = row.get("ticket_code");
    let summary = EventSummary {
        id: row.get("id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image: row.get("cover_image"),
        event_type: row.get("event_type"),
        status: row.get("status"),
        start_time: row.get("start_time"),
        end_time: row.get("end_time"),
        timezone: row.get("timezone"),
        location: row.get("location"),
        virtual_link: row.get("virtual_link"),
        is_public: row.get("is_public"),
        is_premium: row.get("is_premium"),
        max_attendees: row.get("max_attendees"),
        price_cents: row.get("price_cents"),
        going_count: 0,
        host: EventHost {
            id: row.get("host_id"),
            name: row.get("host_name"),
            username: row.get("host_username"),
            avatar: row.get("host_avatar"),
        },
    };

    Ok(EventTicketResponse {
        ticket_code,
        status: row.get("rsvp_status"),
        is_paid: row.get("is_paid"),
        checked_in: row.get("checked_in"),
        checked_in_at: row.get("checked_in_at"),
        event: summary,
    })
}

pub async fn check_in_attendee(
    state: &AppState,
    host_id: Uuid,
    ticket_code: &str,
) -> Result<EventTicketResponse, AppError> {
    let rsvp = sqlx::query(
        r#"
        SELECT
            er.id,
            er.event_id,
            er.ticket_code,
            er.status::text AS rsvp_status,
            er.is_paid,
            er.checked_in,
            er.checked_in_at,
            e.id AS event_id,
            e.title,
            e.description,
            e.cover_image,
            e.event_type::text AS event_type,
            e.status::text AS status,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.is_public,
            e.is_premium,
            e.max_attendees,
            e.price_cents,
            u.id AS host_id,
            u.name AS host_name,
            u.username AS host_username,
            u.avatar AS host_avatar
        FROM event_rsvps er
        JOIN events e ON e.id = er.event_id
        JOIN users u ON u.id = e.host_id
        WHERE er.ticket_code = $1
        "#,
    )
    .bind(ticket_code)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(row) = rsvp else {
        return Err(AppError::NotFound("Event not found".to_string()));
    };

    let event_host: Uuid = row.get("host_id");
    if event_host != host_id {
        return Err(AppError::Unauthorized);
    }

    let rsvp_id: Uuid = row.get("id");

    if !row.get::<bool, _>("checked_in") {
        sqlx::query(
            "UPDATE event_rsvps SET checked_in = TRUE, checked_in_at = NOW(), checked_in_by = $1 WHERE id = $2",
        )
        .bind(host_id)
        .bind(rsvp_id)
        .execute(&state.db_pool)
        .await?;
    }

    let summary = EventSummary {
        id: row.get("event_id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image: row.get("cover_image"),
        event_type: row.get("event_type"),
        status: row.get("status"),
        start_time: row.get("start_time"),
        end_time: row.get("end_time"),
        timezone: row.get("timezone"),
        location: row.get("location"),
        virtual_link: row.get("virtual_link"),
        is_public: row.get("is_public"),
        is_premium: row.get("is_premium"),
        max_attendees: row.get("max_attendees"),
        price_cents: row.get("price_cents"),
        going_count: 0,
        host: EventHost {
            id: event_host,
            name: row.get("host_name"),
            username: row.get("host_username"),
            avatar: row.get("host_avatar"),
        },
    };

    Ok(EventTicketResponse {
        ticket_code: row.get("ticket_code"),
        status: row.get("rsvp_status"),
        is_paid: row.get("is_paid"),
        checked_in: true,
        checked_in_at: Some(Utc::now()),
        event: summary,
    })
}

pub async fn verify_ticket(
    state: &AppState,
    ticket_code: &str,
) -> Result<EventTicketResponse, AppError> {
    let ticket = sqlx::query(
        r#"
        SELECT
            er.ticket_code,
            er.status::text AS rsvp_status,
            er.is_paid,
            er.checked_in,
            er.checked_in_at,
            e.id,
            e.title,
            e.description,
            e.cover_image,
            e.event_type::text AS event_type,
            e.status::text AS status,
            e.start_time,
            e.end_time,
            e.timezone,
            e.location,
            e.virtual_link,
            e.is_public,
            e.is_premium,
            e.max_attendees,
            e.price_cents,
            u.id AS host_id,
            u.name AS host_name,
            u.username AS host_username,
            u.avatar AS host_avatar
        FROM event_rsvps er
        JOIN events e ON e.id = er.event_id
        JOIN users u ON u.id = e.host_id
        WHERE er.ticket_code = $1
        "#,
    )
    .bind(ticket_code)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(row) = ticket else {
        return Err(AppError::NotFound("Event not found".to_string()));
    };

    let event = EventSummary {
        id: row.get("id"),
        title: row.get("title"),
        description: row.get("description"),
        cover_image: row.get("cover_image"),
        event_type: row.get("event_type"),
        status: row.get("status"),
        start_time: row.get("start_time"),
        end_time: row.get("end_time"),
        timezone: row.get("timezone"),
        location: row.get("location"),
        virtual_link: row.get("virtual_link"),
        is_public: row.get("is_public"),
        is_premium: row.get("is_premium"),
        max_attendees: row.get("max_attendees"),
        price_cents: row.get("price_cents"),
        going_count: 0,
        host: EventHost {
            id: row.get("host_id"),
            name: row.get("host_name"),
            username: row.get("host_username"),
            avatar: row.get("host_avatar"),
        },
    };

    Ok(EventTicketResponse {
        ticket_code: row.get("ticket_code"),
        status: row.get("rsvp_status"),
        is_paid: row.get("is_paid"),
        checked_in: row.get("checked_in"),
        checked_in_at: row.get("checked_in_at"),
        event,
    })
}

pub async fn create_event_reminder(
    state: &AppState,
    event_id: Uuid,
    user_id: Uuid,
    input: EventReminderInput,
) -> Result<EventReminderResponse, AppError> {
    let reminder =
        sqlx::query_as::<_, (Uuid, Uuid, Uuid, DateTime<Utc>, bool, Option<DateTime<Utc>>)>(
            r#"
        INSERT INTO event_reminders (id, event_id, user_id, reminder_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, event_id, user_id, reminder_at, sent, sent_at
        "#,
        )
        .bind(Uuid::new_v4())
        .bind(event_id)
        .bind(user_id)
        .bind(input.reminder_at)
        .fetch_one(&state.db_pool)
        .await?;

    Ok(EventReminderResponse {
        id: reminder.0,
        event_id: reminder.1,
        user_id: reminder.2,
        reminder_at: reminder.3,
        sent: reminder.4,
        sent_at: reminder.5,
    })
}

fn apply_event_filters(builder: &mut QueryBuilder<'_, sqlx::Postgres>, filters: &EventListFilters) {
    if let Some(status) = filters.status.as_ref() {
        builder
            .push(" AND e.status = ")
            .push_bind(status.to_ascii_uppercase())
            .push("::event_status");
    } else {
        builder.push(" AND e.status = 'PUBLISHED'::event_status");
    }

    if let Some(host_id) = filters.host_id {
        builder.push(" AND e.host_id = ").push_bind(host_id);
    }

    if let Some(event_type) = filters.event_type.as_ref() {
        builder
            .push(" AND e.event_type = ")
            .push_bind(event_type.to_ascii_uppercase())
            .push("::event_type");
    }

    if let Some(search) = filters.search.as_ref() {
        let pattern = format!("%{}%", search.trim());
        builder
            .push(" AND (e.title ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR e.description ILIKE ")
            .push_bind(pattern)
            .push(")");
    }

    if filters.upcoming {
        builder.push(" AND e.start_time >= NOW()");
    }

    if filters.past {
        builder.push(" AND e.end_time < NOW()");
    }
}
