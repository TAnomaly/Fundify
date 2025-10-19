use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::welcome_message_service::{
    create_welcome_message, delete_welcome_message, get_welcome_message, get_welcome_messages,
    trigger_welcome_message, update_welcome_message,
    WelcomeMessageCreateRequest, WelcomeMessageResponse, WelcomeMessageUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/welcome-messages", post(handle_create_welcome_message).get(handle_get_welcome_messages))
        .route("/welcome-messages/:id", get(handle_get_welcome_message).put(handle_update_welcome_message).delete(handle_delete_welcome_message))
        .route("/welcome-messages/:id/trigger", post(handle_trigger_welcome_message))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateWelcomeMessageRequest {
    #[validate(length(min = 3, max = 200))]
    title: String,
    #[validate(length(min = 10, max = 2000))]
    content: String,
    #[validate(length(min = 3, max = 50))]
    trigger_event: String, // 'SUBSCRIPTION', 'DONATION', 'FOLLOW', etc.
    #[serde(default)]
    is_active: bool,
    #[serde(default)]
    delay_minutes: u32,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateWelcomeMessageRequest {
    #[validate(length(min = 3, max = 200))]
    title: Option<String>,
    #[validate(length(min = 10, max = 2000))]
    content: Option<String>,
    #[validate(length(min = 3, max = 50))]
    trigger_event: Option<String>,
    #[serde(default)]
    is_active: Option<bool>,
    #[serde(default)]
    delay_minutes: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct WelcomeMessagesQuery {
    page: Option<u32>,
    limit: Option<u32>,
    trigger_event: Option<String>,
    is_active: Option<bool>,
}

async fn handle_create_welcome_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateWelcomeMessageRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = WelcomeMessageCreateRequest {
        title: body.title,
        content: body.content,
        trigger_event: body.trigger_event,
        is_active: body.is_active,
        delay_minutes: body.delay_minutes,
        creator_id: user_id,
    };

    let welcome_message = create_welcome_message(&state, input).await?;
    Ok((StatusCode::CREATED, Json(welcome_message)))
}

async fn handle_get_welcome_messages(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<WelcomeMessagesQuery>,
) -> Result<Json<Vec<WelcomeMessageResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let messages = get_welcome_messages(&state, user_id, page, limit, query.trigger_event, query.is_active).await?;
    Ok(Json(messages))
}

async fn handle_get_welcome_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<WelcomeMessageResponse>, AppError> {
    let message = get_welcome_message(&state, user_id, id).await?;
    Ok(Json(message))
}

async fn handle_update_welcome_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateWelcomeMessageRequest>,
) -> Result<Json<WelcomeMessageResponse>, AppError> {
    body.validate()?;

    let input = WelcomeMessageUpdateRequest {
        title: body.title,
        content: body.content,
        trigger_event: body.trigger_event,
        is_active: body.is_active,
        delay_minutes: body.delay_minutes,
    };

    let message = update_welcome_message(&state, user_id, id, input).await?;
    Ok(Json(message))
}

async fn handle_delete_welcome_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_welcome_message(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn handle_trigger_welcome_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    trigger_welcome_message(&state, user_id, id).await?;
    Ok(StatusCode::OK)
}
