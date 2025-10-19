use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventHost {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventSummary {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: String,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub timezone: String,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub is_public: bool,
    pub is_premium: bool,
    pub max_attendees: Option<i32>,
    pub price_cents: i32,
    pub going_count: i64,
    pub host: EventHost,
}

#[derive(Debug, FromRow)]
pub struct EventSummaryRow {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: String,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub timezone: String,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub is_public: bool,
    pub is_premium: bool,
    pub max_attendees: Option<i32>,
    pub price_cents: i32,
    pub host_id: Uuid,
    pub host_name: String,
    pub host_username: Option<String>,
    pub host_avatar: Option<String>,
    pub going_count: i64,
}

impl EventSummaryRow {
    pub fn into_summary(self) -> EventSummary {
        EventSummary {
            id: self.id,
            title: self.title,
            description: self.description,
            cover_image: self.cover_image,
            event_type: self.event_type,
            status: self.status,
            start_time: self.start_time,
            end_time: self.end_time,
            timezone: self.timezone,
            location: self.location,
            virtual_link: self.virtual_link,
            is_public: self.is_public,
            is_premium: self.is_premium,
            max_attendees: self.max_attendees,
            price_cents: self.price_cents,
            going_count: self.going_count,
            host: EventHost {
                id: self.host_id,
                name: self.host_name,
                username: self.host_username,
                avatar: self.host_avatar,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventDetail {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: String,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub timezone: String,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub max_attendees: Option<i32>,
    pub is_public: bool,
    pub is_premium: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub price_cents: i32,
    pub agenda: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub host: EventHost,
    pub going_count: i64,
    pub user_rsvp_status: Option<String>,
    pub user_rsvp_is_paid: bool,
}

#[derive(Debug, FromRow)]
pub struct EventDetailRow {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub event_type: String,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub timezone: String,
    pub location: Option<String>,
    pub virtual_link: Option<String>,
    pub max_attendees: Option<i32>,
    pub is_public: bool,
    pub is_premium: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub price_cents: i32,
    pub agenda: Option<String>,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub host_id: Uuid,
    pub host_name: String,
    pub host_username: Option<String>,
    pub host_avatar: Option<String>,
    pub going_count: i64,
}

impl EventDetailRow {
    pub fn into_detail(
        self,
        user_rsvp_status: Option<String>,
        user_rsvp_is_paid: bool,
    ) -> EventDetail {
        EventDetail {
            id: self.id,
            title: self.title,
            description: self.description,
            cover_image: self.cover_image,
            event_type: self.event_type,
            status: self.status,
            start_time: self.start_time,
            end_time: self.end_time,
            timezone: self.timezone,
            location: self.location,
            virtual_link: self.virtual_link,
            max_attendees: self.max_attendees,
            is_public: self.is_public,
            is_premium: self.is_premium,
            minimum_tier_id: self.minimum_tier_id,
            price_cents: self.price_cents,
            agenda: self.agenda,
            tags: self.tags,
            created_at: self.created_at,
            updated_at: self.updated_at,
            host: EventHost {
                id: self.host_id,
                name: self.host_name,
                username: self.host_username,
                avatar: self.host_avatar,
            },
            going_count: self.going_count,
            user_rsvp_status,
            user_rsvp_is_paid,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventListResponse {
    pub events: Vec<EventSummary>,
    pub pagination: EventPagination,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventPagination {
    pub page: u32,
    pub limit: u32,
    pub total: i64,
    pub pages: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventRSVPResponse {
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub status: String,
    pub ticket_code: String,
    pub is_paid: bool,
    pub checked_in: bool,
    pub checked_in_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTicketResponse {
    pub ticket_code: String,
    pub status: String,
    pub is_paid: bool,
    pub checked_in: bool,
    pub checked_in_at: Option<DateTime<Utc>>,
    pub event: EventSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventReminderResponse {
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub reminder_at: DateTime<Utc>,
    pub sent: bool,
    pub sent_at: Option<DateTime<Utc>>,
}
