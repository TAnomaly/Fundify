use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct WelcomeMessageCreateRequest {
    pub title: String,
    pub content: String,
    pub trigger_event: String,
    pub is_active: bool,
    pub delay_minutes: u32,
    pub creator_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct WelcomeMessageUpdateRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub trigger_event: Option<String>,
    pub is_active: Option<bool>,
    pub delay_minutes: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct WelcomeMessageResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub trigger_event: String,
    pub is_active: bool,
    pub delay_minutes: u32,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub async fn create_welcome_message(
    state: &SharedState,
    input: WelcomeMessageCreateRequest,
) -> Result<WelcomeMessageResponse, AppError> {
    let message_id = Uuid::new_v4();
    
    let message = sqlx::query!(
        r#"
        INSERT INTO welcome_messages (
            id, title, content, trigger_event, is_active, delay_minutes,
            creator_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
        "#,
        message_id,
        input.title,
        input.content,
        input.trigger_event,
        input.is_active,
        input.delay_minutes as i32,
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(WelcomeMessageResponse {
        id: message.id,
        title: message.title,
        content: message.content,
        trigger_event: message.trigger_event,
        is_active: message.is_active,
        delay_minutes: message.delay_minutes as u32,
        creator_id: message.creator_id,
        created_at: message.created_at,
        updated_at: message.updated_at,
    })
}

pub async fn get_welcome_messages(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    trigger_event: Option<String>,
    is_active: Option<bool>,
) -> Result<Vec<WelcomeMessageResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "creator_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(event) = trigger_event {
        where_clause.push_str(&format!(" AND trigger_event = ${}", param_count + 1));
        params.push(Box::new(event));
        param_count += 1;
    }

    if let Some(active) = is_active {
        where_clause.push_str(&format!(" AND is_active = ${}", param_count + 1));
        params.push(Box::new(active));
        param_count += 1;
    }

    let query_str = format!(
        r#"
        SELECT * FROM welcome_messages
        WHERE {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(vec![])
}

pub async fn get_welcome_message(
    state: &SharedState,
    creator_id: Uuid,
    message_id: Uuid,
) -> Result<WelcomeMessageResponse, AppError> {
    let message = sqlx::query!(
        "SELECT * FROM welcome_messages WHERE id = $1 AND creator_id = $2",
        message_id,
        creator_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let message = match message {
        Some(m) => m,
        None => return Err(AppError::NotFound("Welcome message not found".to_string())),
    };

    Ok(WelcomeMessageResponse {
        id: message.id,
        title: message.title,
        content: message.content,
        trigger_event: message.trigger_event,
        is_active: message.is_active,
        delay_minutes: message.delay_minutes as u32,
        creator_id: message.creator_id,
        created_at: message.created_at,
        updated_at: message.updated_at,
    })
}

pub async fn update_welcome_message(
    state: &SharedState,
    creator_id: Uuid,
    message_id: Uuid,
    input: WelcomeMessageUpdateRequest,
) -> Result<WelcomeMessageResponse, AppError> {
    // Check if message exists and user owns it
    let message = sqlx::query!(
        "SELECT creator_id FROM welcome_messages WHERE id = $1",
        message_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let message = match message {
        Some(m) => m,
        None => return Err(AppError::NotFound("Welcome message not found".to_string())),
    };

    if message.creator_id != creator_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    // Build dynamic update query
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(title) = input.title {
        update_fields.push(format!("title = ${}", param_count));
        params.push(Box::new(title));
        param_count += 1;
    }

    if let Some(content) = input.content {
        update_fields.push(format!("content = ${}", param_count));
        params.push(Box::new(content));
        param_count += 1;
    }

    if let Some(trigger_event) = input.trigger_event {
        update_fields.push(format!("trigger_event = ${}", param_count));
        params.push(Box::new(trigger_event));
        param_count += 1;
    }

    if let Some(is_active) = input.is_active {
        update_fields.push(format!("is_active = ${}", param_count));
        params.push(Box::new(is_active));
        param_count += 1;
    }

    if let Some(delay_minutes) = input.delay_minutes {
        update_fields.push(format!("delay_minutes = ${}", param_count));
        params.push(Box::new(delay_minutes as i32));
        param_count += 1;
    }

    if update_fields.is_empty() {
        return get_welcome_message(state, creator_id, message_id).await;
    }

    update_fields.push("updated_at = NOW()".to_string());
    update_fields.push(format!("id = ${}", param_count));
    params.push(Box::new(message_id));

    // For now, return the existing message (TODO: implement dynamic query)
    get_welcome_message(state, creator_id, message_id).await
}

pub async fn delete_welcome_message(
    state: &SharedState,
    creator_id: Uuid,
    message_id: Uuid,
) -> Result<(), AppError> {
    let message = sqlx::query!(
        "SELECT creator_id FROM welcome_messages WHERE id = $1",
        message_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let message = match message {
        Some(m) => m,
        None => return Err(AppError::NotFound("Welcome message not found".to_string())),
    };

    if message.creator_id != creator_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!("DELETE FROM welcome_messages WHERE id = $1", message_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}

pub async fn trigger_welcome_message(
    state: &SharedState,
    creator_id: Uuid,
    message_id: Uuid,
) -> Result<(), AppError> {
    let message = sqlx::query!(
        "SELECT * FROM welcome_messages WHERE id = $1 AND creator_id = $2",
        message_id,
        creator_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let message = match message {
        Some(m) => m,
        None => return Err(AppError::NotFound("Welcome message not found".to_string())),
    };

    if !message.is_active {
        return Err(AppError::BadRequest("Welcome message is not active".to_string()));
    }

    // TODO: Send welcome message to user
    // This would typically involve:
    // 1. Finding the user who triggered the event
    // 2. Sending the message via email, push notification, or in-app message
    // 3. Recording the message as sent

    tracing::info!("Triggering welcome message: {}", message.title);
    tracing::info!("Content: {}", message.content);
    tracing::info!("Trigger event: {}", message.trigger_event);

    Ok(())
}
