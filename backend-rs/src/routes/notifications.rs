use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    error::AppError,
    models::{
        notification::{
            CreateNotificationRequest, MarkAllReadResponse, NotificationListResponse,
            NotificationWithActor,
        },
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListNotificationsQuery {
    pub cursor: Option<String>,
    pub limit: Option<i32>,
    pub unread_only: Option<bool>,
}

pub fn notifications_router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_notifications))
        .route("/", post(create_notification))
        .route("/mark-all-read", post(mark_all_notifications_read))
        .route("/:id/read", post(mark_notification_read))
}

// GET /api/notifications - List notifications for user
pub async fn list_notifications(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<ListNotificationsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let limit = query.limit.unwrap_or(20).min(50);
    let mut where_clause = "user_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![Box::new(user_id)];
    let mut param_count = 1;

    if let Some(unread_only) = query.unread_only {
        if unread_only {
            param_count += 1;
            where_clause.push_str(&format!(" AND is_read = ${}", param_count));
            params.push(Box::new(false));
        }
    }

    let mut query_str = format!(
        r#"
        SELECT 
            n.id, n.user_id, n.type, n.title, n.message, n.link, n.image_url,
            n.is_read, n.read_at, n.actor_id, n.created_at, n.updated_at,
            u.id as actor_id, u.name as actor_name, u.avatar as actor_avatar
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        WHERE {}
        ORDER BY n.created_at DESC
        LIMIT {}
        "#,
        where_clause,
        limit + 1
    );

    if let Some(cursor) = query.cursor {
        param_count += 1;
        query_str = format!(
            r#"
            SELECT 
                n.id, n.user_id, n.type, n.title, n.message, n.link, n.image_url,
                n.is_read, n.read_at, n.actor_id, n.created_at, n.updated_at,
                u.id as actor_id, u.name as actor_name, u.avatar as actor_avatar
            FROM notifications n
            LEFT JOIN users u ON n.actor_id = u.id
            WHERE {} AND n.id < ${}
            ORDER BY n.created_at DESC
            LIMIT {}
            "#,
            where_clause,
            param_count,
            limit + 1
        );
        params.push(Box::new(cursor));
    }

    let notifications = sqlx::query_as!(
        NotificationWithActor,
        &query_str
    )
    .bind(&*params[0])
    .fetch_all(&state.pool)
    .await?;

    let has_more = notifications.len() > limit as usize;
    let items = if has_more {
        notifications[..limit as usize].to_vec()
    } else {
        notifications
    };

    let next_cursor = if has_more {
        items.last().map(|n| n.id.to_string())
    } else {
        None
    };

    // Get unread count
    let unread_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
        user_id
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "items": items,
            "unread_count": unread_count.unwrap_or(0),
            "next_cursor": next_cursor
        }
    })))
}

// POST /api/notifications - Create notification (helper for testing)
pub async fn create_notification(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateNotificationRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Validate required fields
    if payload.title.is_empty() || payload.message.is_empty() || payload.r#type.is_empty() {
        return Err(AppError::BadRequest(
            "Type, title and message are required".to_string(),
        ));
    }

    let notification = sqlx::query_as!(
        NotificationWithActor,
        r#"
        INSERT INTO notifications (
            id, user_id, type, title, message, link, image_url, 
            is_read, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
            id, user_id, type, title, message, link, image_url,
            is_read, read_at, actor_id, created_at, updated_at,
            NULL as actor_id, NULL as actor_name, NULL as actor_avatar
        "#,
        Uuid::new_v4(),
        user_id,
        payload.r#type,
        payload.title,
        payload.message,
        payload.link,
        payload.image_url,
        false, // is_read starts as false
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": notification
    })))
}

// POST /api/notifications/mark-all-read - Mark all notifications as read
pub async fn mark_all_notifications_read(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let result = sqlx::query!(
        "UPDATE notifications SET is_read = true, read_at = $1 WHERE user_id = $2 AND is_read = false",
        chrono::Utc::now(),
        user_id
    )
    .execute(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "updated": result.rows_affected()
        }
    })))
}

// POST /api/notifications/:id/read - Mark specific notification as read
pub async fn mark_notification_read(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if notification exists and belongs to user
    let notification = sqlx::query!(
        "SELECT id, is_read FROM notifications WHERE id = $1 AND user_id = $2",
        id,
        user_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let notification = notification.ok_or(AppError::NotFound("Notification not found".to_string()))?;

    // Only update if not already read
    if !notification.is_read {
        sqlx::query!(
            "UPDATE notifications SET is_read = true, read_at = $1 WHERE id = $2",
            chrono::Utc::now(),
            id
        )
        .execute(&state.pool)
        .await?;
    }

    Ok(Json(serde_json::json!({
        "success": true
    })))
}
