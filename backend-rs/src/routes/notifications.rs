use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::notification_service::{
    create_notification_for_user, list_notifications, mark_all_notifications_read,
    mark_notification_read, NotificationCreateRequest, NotificationResponse,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/notifications", get(handle_list_notifications).post(handle_create_notification))
        .route("/notifications/mark-all-read", post(handle_mark_all_notifications_read))
        .route("/notifications/:id/read", post(handle_mark_notification_read))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateNotificationRequest {
    #[validate(length(min = 1, max = 200))]
    title: String,
    #[validate(length(min = 1, max = 500))]
    message: String,
    user_id: Uuid,
    notification_type: String,
    link: Option<String>,
    image_url: Option<String>,
    actor_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
struct NotificationsQuery {
    page: Option<u32>,
    limit: Option<u32>,
    unread_only: Option<bool>,
}

async fn handle_list_notifications(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<NotificationsQuery>,
) -> Result<Json<Vec<NotificationResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let unread_only = query.unread_only.unwrap_or(false);
    let notifications = list_notifications(&state, user_id, page, limit, unread_only).await?;
    Ok(Json(notifications))
}

async fn handle_mark_notification_read(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(notification_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    mark_notification_read(&state, user_id, notification_id).await?;
    Ok(StatusCode::OK)
}

async fn handle_mark_all_notifications_read(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    mark_all_notifications_read(&state, user_id).await?;
    Ok(StatusCode::OK)
}

async fn handle_create_notification(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateNotificationRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = NotificationCreateRequest {
        title: body.title,
        message: body.message,
        user_id: body.user_id,
        notification_type: body.notification_type,
        link: body.link,
        image_url: body.image_url,
        actor_id: body.actor_id,
    };

    let notification = create_notification_for_user(&state, input).await?;
    Ok((StatusCode::CREATED, Json(notification)))
}
