use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use axum::Extension;
use serde::{Deserialize, Serialize};

use crate::middleware::auth::AuthUser;
use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(Deserialize)]
pub struct ListNotificationsQuery {
    pub limit: Option<i32>,
    #[serde(rename = "unreadOnly")]
    pub unread_only: Option<bool>,
}

#[derive(Serialize)]
pub struct NotificationResponse {
    pub id: String,
    #[serde(rename = "type")]
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub link: Option<String>,
    #[serde(rename = "imageUrl")]
    pub image_url: Option<String>,
    #[serde(rename = "isRead")]
    pub is_read: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub actor: Option<ActorInfo>,
}

#[derive(Serialize)]
pub struct ActorInfo {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Serialize)]
pub struct NotificationsListResponse {
    pub items: Vec<NotificationResponse>,
    #[serde(rename = "unreadCount")]
    pub unread_count: i64,
}

pub async fn list_notifications(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(params): Query<ListNotificationsQuery>,
) -> AppResult<impl IntoResponse> {
    let limit = params.limit.unwrap_or(20).min(50);
    let unread_only = params.unread_only.unwrap_or(false);

    let query = if unread_only {
        r#"SELECT n.id, n.type, n.title, n.message, n.link, n."imageUrl", n."isRead", n."createdAt",
           u.id as actor_id, u.name as actor_name, u.avatar as actor_avatar
        FROM "Notification" n
        LEFT JOIN "User" u ON n."actorId" = u.id
        WHERE n."userId" = $1 AND n."isRead" = false
        ORDER BY n."createdAt" DESC
        LIMIT $2"#
    } else {
        r#"SELECT n.id, n.type, n.title, n.message, n.link, n."imageUrl", n."isRead", n."createdAt",
           u.id as actor_id, u.name as actor_name, u.avatar as actor_avatar
        FROM "Notification" n
        LEFT JOIN "User" u ON n."actorId" = u.id
        WHERE n."userId" = $1
        ORDER BY n."createdAt" DESC
        LIMIT $2"#
    };

    let rows = sqlx::query(query)
        .bind(auth_user.id.to_string())
        .bind(limit)
        .fetch_all(&state.db)
        .await?;

    // Get unread count
    let (unread_count,): (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM "Notification" WHERE "userId" = $1 AND "isRead" = false"#,
    )
    .bind(auth_user.id.to_string())
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    let mut notifications = Vec::new();
    for row in rows {
        let actor_info = if row.try_get::<String, _>("actor_id").is_ok() {
            Some(ActorInfo {
                id: row.get("actor_id"),
                name: row.get("actor_name"),
                avatar: row.get("actor_avatar"),
            })
        } else {
            None
        };

        notifications.push(NotificationResponse {
            id: row.get("id"),
            notification_type: row.get("type"),
            title: row.get("title"),
            message: row.get("message"),
            link: row.get("link"),
            image_url: row.get("imageUrl"),
            is_read: row.get("isRead"),
            created_at: row
                .get::<chrono::NaiveDateTime, _>("createdAt")
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
            actor: actor_info,
        });
    }

    Ok(ApiResponse::success(NotificationsListResponse {
        items: notifications,
        unread_count,
    }))
}

pub async fn mark_read(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    // Check notification exists and belongs to user
    let notification: Option<(bool,)> =
        sqlx::query_as(r#"SELECT "isRead" FROM "Notification" WHERE id = $1 AND "userId" = $2"#)
            .bind(&id)
            .bind(auth_user.id.to_string())
            .fetch_optional(&state.db)
            .await?;

    let (is_read,) =
        notification.ok_or_else(|| AppError::NotFound("Notification not found".to_string()))?;

    if !is_read {
        sqlx::query(r#"UPDATE "Notification" SET "isRead" = true, "readAt" = NOW() WHERE id = $1"#)
            .bind(&id)
            .execute(&state.db)
            .await?;
    }

    Ok(ApiResponse::success("Notification marked as read"))
}

pub async fn mark_all_read(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> AppResult<impl IntoResponse> {
    let result = sqlx::query(
        r#"UPDATE "Notification" SET "isRead" = true, "readAt" = NOW()
        WHERE "userId" = $1 AND "isRead" = false"#,
    )
    .bind(auth_user.id.to_string())
    .execute(&state.db)
    .await?;

    #[derive(Serialize)]
    struct MarkAllResponse {
        updated: u64,
    }

    Ok(ApiResponse::success(MarkAllResponse {
        updated: result.rows_affected(),
    }))
}
