use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};

use crate::{
    auth::AuthUser,
    error::AppError,
    models::{
        welcome_message::{
            CreateWelcomeMessageRequest, TriggerWelcomeMessageRequest, UpdateWelcomeMessageRequest,
            WelcomeMessageWithRelations,
        },
    },
    state::AppState,
};

pub fn welcome_messages_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_welcome_message))
        .route("/", get(get_welcome_messages))
        .route("/:id", get(get_welcome_message))
        .route("/:id", put(update_welcome_message))
        .route("/:id", delete(delete_welcome_message))
        .route("/:id/trigger", post(trigger_welcome_message))
}

// POST /api/welcome-messages - Create a welcome message
pub async fn create_welcome_message(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateWelcomeMessageRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Validate required fields
    if payload.subject.is_empty() || payload.content.is_empty() {
        return Err(AppError::BadRequest(
            "Subject and content are required".to_string(),
        ));
    }

    // Create welcome message
    let welcome_message = sqlx::query_as!(
        WelcomeMessageWithRelations,
        r#"
        INSERT INTO welcome_messages (
            id, subject, content, tier_id, delay, is_active, 
            sent_count, creator_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
            id, subject, content, tier_id, delay, is_active, 
            sent_count, creator_id, created_at, updated_at,
            NULL as creator_id, NULL as creator_name, NULL as creator_avatar,
            NULL as tier_id, NULL as tier_name, NULL as tier_price
        "#,
        uuid::Uuid::new_v4(),
        payload.subject,
        payload.content,
        payload.tier_id,
        payload.delay.unwrap_or(0),
        payload.is_active.unwrap_or(true),
        0, // sent_count starts at 0
        user_id,
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Welcome message created",
        "data": welcome_message
    })))
}

// GET /api/welcome-messages - Get all welcome messages for creator
pub async fn get_welcome_messages(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let welcome_messages = sqlx::query_as!(
        WelcomeMessageWithRelations,
        r#"
        SELECT 
            wm.id, wm.subject, wm.content, wm.tier_id, wm.delay, wm.is_active,
            wm.sent_count, wm.creator_id, wm.created_at, wm.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
        FROM welcome_messages wm
        LEFT JOIN users u ON wm.creator_id = u.id
        LEFT JOIN membership_tiers mt ON wm.tier_id = mt.id
        WHERE wm.creator_id = $1
        ORDER BY wm.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": welcome_messages
    })))
}

// GET /api/welcome-messages/:id - Get a single welcome message
pub async fn get_welcome_message(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let welcome_message = sqlx::query_as!(
        WelcomeMessageWithRelations,
        r#"
        SELECT 
            wm.id, wm.subject, wm.content, wm.tier_id, wm.delay, wm.is_active,
            wm.sent_count, wm.creator_id, wm.created_at, wm.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
        FROM welcome_messages wm
        LEFT JOIN users u ON wm.creator_id = u.id
        LEFT JOIN membership_tiers mt ON wm.tier_id = mt.id
        WHERE wm.id = $1
        "#,
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let welcome_message = welcome_message.ok_or(AppError::NotFound("Welcome message not found".to_string()))?;

    // Check ownership
    if welcome_message.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "data": welcome_message
    })))
}

// PUT /api/welcome-messages/:id - Update a welcome message
pub async fn update_welcome_message(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<UpdateWelcomeMessageRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if welcome message exists and user owns it
    let existing_message = sqlx::query!(
        "SELECT creator_id FROM welcome_messages WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_message = existing_message.ok_or(AppError::NotFound("Welcome message not found".to_string()))?;

    if existing_message.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    // Build update query dynamically
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![];
    let mut param_count = 0;

    if let Some(subject) = payload.subject {
        param_count += 1;
        update_fields.push(format!("subject = ${}", param_count));
        params.push(Box::new(subject));
    }
    if let Some(content) = payload.content {
        param_count += 1;
        update_fields.push(format!("content = ${}", param_count));
        params.push(Box::new(content));
    }
    if let Some(tier_id) = payload.tier_id {
        param_count += 1;
        update_fields.push(format!("tier_id = ${}", param_count));
        params.push(Box::new(tier_id));
    }
    if let Some(delay) = payload.delay {
        param_count += 1;
        update_fields.push(format!("delay = ${}", param_count));
        params.push(Box::new(delay));
    }
    if let Some(is_active) = payload.is_active {
        param_count += 1;
        update_fields.push(format!("is_active = ${}", param_count));
        params.push(Box::new(is_active));
    }

    if update_fields.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    param_count += 1;
    update_fields.push(format!("updated_at = ${}", param_count));
    params.push(Box::new(chrono::Utc::now()));

    param_count += 1;
    params.push(Box::new(id));

    let query = format!(
        "UPDATE welcome_messages SET {} WHERE id = ${}",
        update_fields.join(", "),
        param_count
    );

    sqlx::query(&query)
        .bind(&*params[0])
        .execute(&state.pool)
        .await?;

    // Fetch updated message
    let updated_message = sqlx::query_as!(
        WelcomeMessageWithRelations,
        r#"
        SELECT 
            wm.id, wm.subject, wm.content, wm.tier_id, wm.delay, wm.is_active,
            wm.sent_count, wm.creator_id, wm.created_at, wm.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
        FROM welcome_messages wm
        LEFT JOIN users u ON wm.creator_id = u.id
        LEFT JOIN membership_tiers mt ON wm.tier_id = mt.id
        WHERE wm.id = $1
        "#,
        id
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Welcome message updated",
        "data": updated_message
    })))
}

// DELETE /api/welcome-messages/:id - Delete a welcome message
pub async fn delete_welcome_message(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if welcome message exists and user owns it
    let existing_message = sqlx::query!(
        "SELECT creator_id FROM welcome_messages WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_message = existing_message.ok_or(AppError::NotFound("Welcome message not found".to_string()))?;

    if existing_message.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    sqlx::query!("DELETE FROM welcome_messages WHERE id = $1", id)
        .execute(&state.pool)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Welcome message deleted"
    })))
}

// POST /api/welcome-messages/:id/trigger - Trigger welcome message (test)
pub async fn trigger_welcome_message(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<TriggerWelcomeMessageRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if welcome message exists and user owns it
    let welcome_message = sqlx::query!(
        "SELECT creator_id, subject, content FROM welcome_messages WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let welcome_message = welcome_message.ok_or(AppError::NotFound("Welcome message not found".to_string()))?;

    if welcome_message.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    // Send test message
    sqlx::query!(
        r#"
        INSERT INTO messages (id, content, type, sender_id, receiver_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        uuid::Uuid::new_v4(),
        format!("[TEST] **{}**\n\n{}", welcome_message.subject, welcome_message.content),
        "TEXT",
        user_id,
        payload.test_subscriber_id,
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .execute(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Test welcome message sent"
    })))
}
