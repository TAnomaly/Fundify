use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::models::event::{
    EventDetail, EventListResponse, EventRSVPResponse, EventReminderResponse, EventTicketResponse,
};
use crate::services::event_service::{
    check_in_attendee, create_event, create_event_reminder, delete_event, get_event_by_id,
    get_event_ticket, list_event_rsvps, list_events, update_event, upsert_rsvp, verify_ticket,
    EventCreateInput, EventListFilters, EventReminderInput, EventUpdateInput, RsvpInput,
};
use crate::state::SharedState;
use chrono::{DateTime, Utc};

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/events", get(handle_list_events).post(handle_create_event))
        .route(
            "/events/:id",
            get(handle_get_event)
                .put(handle_update_event)
                .delete(handle_delete_event),
        )
        .route("/events/:id/rsvp", post(handle_rsvp_event))
        .route("/events/:id/rsvps", get(handle_list_event_rsvps))
        .route("/events/:id/ticket", get(handle_get_ticket))
        .route("/events/checkin", post(handle_check_in_attendee))
        .route("/events/verify/:ticket_code", get(handle_verify_ticket))
        .route("/events/:id/reminders", post(handle_create_event_reminder))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventQuery {
    status: Option<String>,
    host_id: Option<Uuid>,
    event_type: Option<String>,
    upcoming: Option<bool>,
    past: Option<bool>,
    search: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct EventRequest {
    #[validate(length(min = 3, max = 160))]
    title: String,
    #[serde(default)]
    #[validate(length(max = 5000))]
    description: Option<String>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    event_type: String,
    #[serde(default)]
    status: Option<String>,
    start_time: DateTime<Utc>,
    #[serde(default)]
    end_time: Option<DateTime<Utc>>,
    #[serde(default)]
    timezone: Option<String>,
    #[serde(default)]
    location: Option<String>,
    #[serde(default)]
    virtual_link: Option<String>,
    #[serde(default)]
    max_attendees: Option<i32>,
    #[serde(default = "default_true")]
    is_public: bool,
    #[serde(default)]
    is_premium: bool,
    #[serde(default)]
    minimum_tier_id: Option<Uuid>,
    #[serde(default)]
    price_cents: Option<i32>,
    #[serde(default)]
    agenda: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct EventUpdateRequest {
    #[serde(default)]
    #[validate(length(min = 3, max = 160))]
    title: Option<String>,
    #[serde(default)]
    #[validate(length(max = 5000))]
    description: Option<String>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    event_type: Option<String>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    start_time: Option<DateTime<Utc>>,
    #[serde(default)]
    end_time: Option<DateTime<Utc>>,
    #[serde(default)]
    timezone: Option<String>,
    #[serde(default)]
    location: Option<String>,
    #[serde(default)]
    virtual_link: Option<String>,
    #[serde(default)]
    max_attendees: Option<i32>,
    #[serde(default)]
    is_public: Option<bool>,
    #[serde(default)]
    is_premium: Option<bool>,
    #[serde(default)]
    minimum_tier_id: Option<Uuid>,
    #[serde(default)]
    price_cents: Option<i32>,
    #[serde(default)]
    agenda: Option<String>,
    #[serde(default)]
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct RsvpRequest {
    #[validate(length(min = 2, max = 20))]
    status: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CheckInRequest {
    #[validate(length(min = 10))]
    ticket_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReminderRequest {
    reminder_at: DateTime<Utc>,
}

async fn handle_list_events(
    State(state): State<SharedState>,
    OptionalAuthUser(viewer): OptionalAuthUser,
    Query(query): Query<EventQuery>,
) -> Result<Json<EventListResponse>, AppError> {
    let filters = EventListFilters {
        status: query.status.map(|s| s.to_ascii_uppercase()),
        host_id: query.host_id,
        event_type: query.event_type.map(|s| s.to_ascii_uppercase()),
        upcoming: query.upcoming.unwrap_or(false),
        past: query.past.unwrap_or(false),
        search: query.search.map(|s| s.trim().to_string()),
        page: query.page.unwrap_or(1),
        limit: query.limit.unwrap_or(10),
    };

    let viewer_id = viewer.map(|auth| auth.id);
    let response = list_events(&state, filters, viewer_id).await?;
    Ok(Json(response))
}

async fn handle_get_event(
    State(state): State<SharedState>,
    OptionalAuthUser(viewer): OptionalAuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<EventDetail>, AppError> {
    let event = get_event_by_id(&state, id, viewer.map(|auth| auth.id)).await?;
    Ok(Json(event))
}

async fn handle_create_event(
    State(state): State<SharedState>,
    AuthUser { id: host_id, .. }: AuthUser,
    Json(body): Json<EventRequest>,
) -> Result<Json<EventDetail>, AppError> {
    body.validate()?;

    let input = EventCreateInput {
        title: body.title,
        description: body.description,
        cover_image: body.cover_image,
        event_type: body.event_type.to_ascii_uppercase(),
        status: body.status.map(|s| s.to_ascii_uppercase()),
        start_time: body.start_time,
        end_time: body.end_time,
        timezone: body.timezone,
        location: body.location,
        virtual_link: body.virtual_link,
        max_attendees: body.max_attendees,
        is_public: body.is_public,
        is_premium: body.is_premium,
        minimum_tier_id: body.minimum_tier_id,
        price_cents: body.price_cents.unwrap_or(0),
        agenda: body.agenda,
        tags: body.tags,
    };

    let event = create_event(&state, host_id, input).await?;
    Ok(Json(event))
}

async fn handle_update_event(
    State(state): State<SharedState>,
    AuthUser { id: host_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<EventUpdateRequest>,
) -> Result<Json<EventDetail>, AppError> {
    body.validate()?;

    let input = EventUpdateInput {
        title: body.title,
        description: body.description,
        cover_image: body.cover_image,
        event_type: body.event_type.map(|s| s.to_ascii_uppercase()),
        status: body.status.map(|s| s.to_ascii_uppercase()),
        start_time: body.start_time,
        end_time: body.end_time,
        timezone: body.timezone,
        location: body.location,
        virtual_link: body.virtual_link,
        max_attendees: body.max_attendees.map(Some),
        is_public: body.is_public,
        is_premium: body.is_premium,
        minimum_tier_id: body.minimum_tier_id.map(Some),
        price_cents: body.price_cents,
        agenda: body.agenda.map(Some),
        tags: body.tags,
    };

    let event = update_event(&state, id, host_id, input).await?;
    Ok(Json(event))
}

async fn handle_delete_event(
    State(state): State<SharedState>,
    AuthUser { id: host_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    delete_event(&state, id, host_id).await
}

async fn handle_rsvp_event(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<RsvpRequest>,
) -> Result<Json<EventRSVPResponse>, AppError> {
    body.validate()?;
    let rsvp = upsert_rsvp(
        &state,
        id,
        user_id,
        RsvpInput {
            status: body.status.to_ascii_uppercase(),
        },
    )
    .await?;

    Ok(Json(rsvp))
}

#[derive(Debug, Deserialize)]
struct RSVPQuery {
    status: Option<String>,
}

async fn handle_list_event_rsvps(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
    Query(query): Query<RSVPQuery>,
) -> Result<Json<Vec<EventRSVPResponse>>, AppError> {
    let list = list_event_rsvps(&state, id, query.status.map(|s| s.to_ascii_uppercase())).await?;
    Ok(Json(list))
}

async fn handle_get_ticket(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<EventTicketResponse>, AppError> {
    let ticket = get_event_ticket(&state, id, user_id).await?;
    Ok(Json(ticket))
}

async fn handle_check_in_attendee(
    State(state): State<SharedState>,
    AuthUser { id: host_id, .. }: AuthUser,
    Json(body): Json<CheckInRequest>,
) -> Result<Json<EventTicketResponse>, AppError> {
    body.validate()?;
    let ticket = check_in_attendee(&state, host_id, &body.ticket_code).await?;
    Ok(Json(ticket))
}

async fn handle_verify_ticket(
    State(state): State<SharedState>,
    Path(ticket_code): Path<String>,
) -> Result<Json<EventTicketResponse>, AppError> {
    let ticket = verify_ticket(&state, &ticket_code).await?;
    Ok(Json(ticket))
}

async fn handle_create_event_reminder(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<ReminderRequest>,
) -> Result<Json<EventReminderResponse>, AppError> {
    let reminder = create_event_reminder(
        &state,
        id,
        user_id,
        EventReminderInput {
            reminder_at: body.reminder_at,
        },
    )
    .await?;

    Ok(Json(reminder))
}
