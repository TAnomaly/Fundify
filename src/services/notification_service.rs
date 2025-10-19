use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct NotificationCreateRequest {
    pub title: String,
    pub message: String,
    pub user_id: Uuid,
    pub notification_type: String,
    pub link: Option<String>,
    pub image_url: Option<String>,
    pub actor_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct NotificationResponse {
    pub id: Uuid,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub link: Option<String>,
    pub image_url: Option<String>,
    pub actor_id: Option<Uuid>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
    pub actor: Option<NotificationActor>,
}

#[derive(Debug, Serialize)]
pub struct NotificationActor {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

pub async fn list_notifications(
    state: &SharedState,
    user_id: Uuid,
    page: u32,
    limit: u32,
    unread_only: bool,
) -> Result<Vec<NotificationResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "user_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if unread_only {
        where_clause.push_str(" AND is_read = false");
    }

    let query_str = format!(
        r#"
        SELECT 
            n.*,
            u.name as actor_name,
            u.avatar as actor_avatar
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        WHERE {}
        ORDER BY n.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(vec![])
}

pub async fn mark_notification_read(
    state: &SharedState,
    user_id: Uuid,
    notification_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
        notification_id,
        user_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn mark_all_notifications_read(
    state: &SharedState,
    user_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        "UPDATE notifications SET is_read = true WHERE user_id = $1",
        user_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn create_notification_for_user(
    state: &SharedState,
    input: NotificationCreateRequest,
) -> Result<NotificationResponse, AppError> {
    let notification_id = Uuid::new_v4();
    
    let notification = sqlx::query!(
        r#"
        INSERT INTO notifications (
            id, title, message, notification_type, link, 
            image_url, actor_id, user_id, is_read, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW())
        RETURNING *
        "#,
        notification_id,
        input.title,
        input.message,
        input.notification_type,
        input.link,
        input.image_url,
        input.actor_id,
        input.user_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    let actor = if let Some(actor_id) = input.actor_id {
        let user = sqlx::query!(
            "SELECT id, name, avatar FROM users WHERE id = $1",
            actor_id
        )
        .fetch_optional(&state.db_pool)
        .await?;
        
        user.map(|u| NotificationActor {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
        })
    } else {
        None
    };

    Ok(NotificationResponse {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        notification_type: notification.notification_type,
        link: notification.link,
        image_url: notification.image_url,
        actor_id: notification.actor_id,
        is_read: notification.is_read,
        created_at: notification.created_at,
        actor,
    })
}
