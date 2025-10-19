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
use crate::services::message_service::{
    delete_message, get_broadcast_messages, get_conversation, get_unread_count,
    get_user_conversations, mark_message_as_read, send_message,
    MessageCreateRequest, MessageResponse, ConversationResponse, BroadcastMessageResponse,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/messages", post(handle_send_message))
        .route("/messages/conversations", get(handle_get_user_conversations))
        .route("/messages/conversation/:other_user_id", get(handle_get_conversation))
        .route("/messages/broadcasts/:creator_id", get(handle_get_broadcast_messages))
        .route("/messages/:message_id/read", put(handle_mark_message_as_read))
        .route("/messages/:message_id", delete(handle_delete_message))
        .route("/messages/unread/count", get(handle_get_unread_count))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct SendMessageRequest {
    #[validate(length(min = 1, max = 1000))]
    content: String,
    recipient_id: Option<Uuid>,
    creator_id: Option<Uuid>,
    message_type: String, // 'DIRECT' or 'BROADCAST'
}

#[derive(Debug, Deserialize)]
struct ConversationQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct BroadcastQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn handle_send_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<SendMessageRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = MessageCreateRequest {
        content: body.content,
        sender_id: user_id,
        recipient_id: body.recipient_id,
        creator_id: body.creator_id,
        message_type: body.message_type,
    };

    let message = send_message(&state, input).await?;
    Ok((StatusCode::CREATED, Json(message)))
}

async fn handle_get_user_conversations(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<ConversationQuery>,
) -> Result<Json<Vec<ConversationResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let conversations = get_user_conversations(&state, user_id, page, limit).await?;
    Ok(Json(conversations))
}

async fn handle_get_conversation(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(other_user_id): Path<Uuid>,
    Query(query): Query<ConversationQuery>,
) -> Result<Json<Vec<MessageResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);
    let messages = get_conversation(&state, user_id, other_user_id, page, limit).await?;
    Ok(Json(messages))
}

async fn handle_get_broadcast_messages(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(creator_id): Path<Uuid>,
    Query(query): Query<BroadcastQuery>,
) -> Result<Json<Vec<BroadcastMessageResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let messages = get_broadcast_messages(&state, user_id, creator_id, page, limit).await?;
    Ok(Json(messages))
}

async fn handle_mark_message_as_read(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(message_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    mark_message_as_read(&state, user_id, message_id).await?;
    Ok(StatusCode::OK)
}

async fn handle_delete_message(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(message_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_message(&state, user_id, message_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn handle_get_unread_count(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let count = get_unread_count(&state, user_id).await?;
    Ok(Json(serde_json::json!({
        "unread_count": count
    })))
}
