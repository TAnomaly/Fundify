use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use uuid::Uuid;

use crate::{
    models::message::{
        SendMessageRequest, MessageResponse, MessagesListResponse, ConversationsListResponse,
        UnreadCountResponse,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

pub fn messages_router() -> Router<AppState> {
    Router::new()
        .route("/", post(send_message))
        .route("/conversations", get(get_user_conversations))
        .route("/conversation/:other_user_id", get(get_conversation))
        .route("/broadcasts/:creator_id", get(get_broadcast_messages))
        .route("/:message_id/read", put(mark_message_as_read))
        .route("/:message_id", delete(delete_message))
        .route("/unread/count", get(get_unread_count))
}

async fn send_message(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<SendMessageRequest>,
) -> Result<Json<MessageResponse>, (StatusCode, Json<serde_json::Value>)> {
    if payload.is_broadcast.unwrap_or(false) {
        // Check if user is a creator
        let user_data = sqlx::query!(
            "SELECT is_creator FROM users WHERE id = $1",
            user.id
        )
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Database error"
                })),
            )
        })?;

        if let Some(user_data) = user_data {
            if !user_data.is_creator {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Only creators can send broadcast messages"
                    })),
                ));
            }
        }
    } else if payload.receiver_id.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "Receiver ID is required for direct messages"
            })),
        ));
    }

    let message_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO messages (id, sender_id, receiver_id, content, message_type, attachment_url, attachment_name, is_broadcast, is_read, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10)",
        message_id,
        user.id,
        payload.receiver_id,
        payload.content,
        payload.message_type.unwrap_or_else(|| "text".to_string()),
        payload.attachment_url,
        payload.attachment_name,
        payload.is_broadcast.unwrap_or(false),
        now,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to send message"
            })),
        )
    })?;

    // Fetch the created message with user info
    let message_with_users = get_message_with_users(&state, message_id).await?;

    Ok(Json(MessageResponse {
        success: true,
        message: Some("Message sent successfully".to_string()),
        data: Some(message_with_users),
    }))
}

async fn get_user_conversations(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<ConversationsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let conversations = sqlx::query_as!(
        crate::models::message::Conversation,
        r#"
        WITH conversation_partners AS (
            SELECT DISTINCT
                CASE 
                    WHEN sender_id = $1 THEN receiver_id
                    WHEN receiver_id = $1 THEN sender_id
                END as other_user_id
            FROM messages
            WHERE (sender_id = $1 OR receiver_id = $1) AND is_broadcast = false
        ),
        last_messages AS (
            SELECT 
                m.*,
                ROW_NUMBER() OVER (PARTITION BY 
                    CASE 
                        WHEN m.sender_id = $1 THEN m.receiver_id
                        WHEN m.receiver_id = $1 THEN m.sender_id
                    END 
                    ORDER BY m.created_at DESC
                ) as rn
            FROM messages m
            WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND m.is_broadcast = false
        ),
        unread_counts AS (
            SELECT 
                CASE 
                    WHEN sender_id = $1 THEN receiver_id
                    WHEN receiver_id = $1 THEN sender_id
                END as other_user_id,
                COUNT(*) as unread_count
            FROM messages
            WHERE (sender_id = $1 OR receiver_id = $1) 
                AND is_broadcast = false 
                AND is_read = false
                AND sender_id != $1
            GROUP BY 
                CASE 
                    WHEN sender_id = $1 THEN receiver_id
                    WHEN receiver_id = $1 THEN sender_id
                END
        )
        SELECT 
            u.id as "other_user_id",
            u.name as "other_user_name",
            u.avatar as "other_user_avatar",
            lm.id as "last_message_id",
            lm.sender_id as "last_message_sender_id",
            lm.receiver_id as "last_message_receiver_id",
            lm.content as "last_message_content",
            lm.message_type as "last_message_type",
            lm.attachment_url as "last_message_attachment_url",
            lm.attachment_name as "last_message_attachment_name",
            lm.is_broadcast as "last_message_is_broadcast",
            lm.is_read as "last_message_is_read",
            lm.created_at as "last_message_created_at",
            lm.updated_at as "last_message_updated_at",
            COALESCE(uc.unread_count, 0) as "unread_count"
        FROM conversation_partners cp
        JOIN users u ON cp.other_user_id = u.id
        LEFT JOIN last_messages lm ON lm.other_user_id = cp.other_user_id AND lm.rn = 1
        LEFT JOIN unread_counts uc ON uc.other_user_id = cp.other_user_id
        ORDER BY lm.created_at DESC NULLS LAST
        "#,
        user.id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(ConversationsListResponse {
        success: true,
        data: conversations,
    }))
}

async fn get_conversation(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(other_user_id): Path<Uuid>,
) -> Result<Json<MessagesListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let messages = sqlx::query_as!(
        crate::models::message::MessageWithUsers,
        r#"
        SELECT 
            m.id,
            m.sender_id,
            m.receiver_id,
            m.content,
            m.message_type,
            m.attachment_url,
            m.attachment_name,
            m.is_broadcast,
            m.is_read,
            m.created_at,
            m.updated_at,
            s.id as "sender_id",
            s.name as "sender_name",
            s.avatar as "sender_avatar",
            r.id as "receiver_id",
            r.name as "receiver_name",
            r.avatar as "receiver_avatar"
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.receiver_id = r.id
        WHERE ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))
            AND m.is_broadcast = false
        ORDER BY m.created_at ASC
        "#,
        user.id,
        other_user_id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(MessagesListResponse {
        success: true,
        data: messages,
    }))
}

async fn get_broadcast_messages(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(creator_id): Path<Uuid>,
) -> Result<Json<MessagesListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let messages = sqlx::query_as!(
        crate::models::message::MessageWithUsers,
        r#"
        SELECT 
            m.id,
            m.sender_id,
            m.receiver_id,
            m.content,
            m.message_type,
            m.attachment_url,
            m.attachment_name,
            m.is_broadcast,
            m.is_read,
            m.created_at,
            m.updated_at,
            s.id as "sender_id",
            s.name as "sender_name",
            s.avatar as "sender_avatar",
            NULL as "receiver_id",
            NULL as "receiver_name",
            NULL as "receiver_avatar"
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        WHERE m.sender_id = $1 AND m.is_broadcast = true
        ORDER BY m.created_at DESC
        "#,
        creator_id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(MessagesListResponse {
        success: true,
        data: messages,
    }))
}

async fn mark_message_as_read(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(message_id): Path<Uuid>,
) -> Result<Json<MessageResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if message exists and user is the receiver
    let message = sqlx::query!(
        "SELECT id, receiver_id FROM messages WHERE id = $1",
        message_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(message) = message {
        if message.receiver_id != Some(user.id) {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to mark this message as read"
                })),
            ));
        }

        // Mark message as read
        sqlx::query!(
            "UPDATE messages SET is_read = true, updated_at = $1 WHERE id = $2",
            chrono::Utc::now(),
            message_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to mark message as read"
                })),
            )
        })?;

        Ok(Json(MessageResponse {
            success: true,
            message: Some("Message marked as read".to_string()),
            data: None,
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Message not found"
            })),
        ))
    }
}

async fn delete_message(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(message_id): Path<Uuid>,
) -> Result<Json<MessageResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if message exists and user is the sender
    let message = sqlx::query!(
        "SELECT id, sender_id FROM messages WHERE id = $1",
        message_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(message) = message {
        if message.sender_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to delete this message"
                })),
            ));
        }

        // Delete message
        sqlx::query!("DELETE FROM messages WHERE id = $1", message_id)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to delete message"
                    })),
                )
            })?;

        Ok(Json(MessageResponse {
            success: true,
            message: Some("Message deleted successfully".to_string()),
            data: None,
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Message not found"
            })),
        ))
    }
}

async fn get_unread_count(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<UnreadCountResponse>, (StatusCode, Json<serde_json::Value>)> {
    let count = sqlx::query!(
        "SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false",
        user.id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(UnreadCountResponse {
        success: true,
        data: crate::models::message::UnreadCount {
            count: count.count.unwrap_or(0),
        },
    }))
}

async fn get_message_with_users(
    state: &AppState,
    message_id: Uuid,
) -> Result<crate::models::message::MessageWithUsers, (StatusCode, Json<serde_json::Value>)> {
    let message = sqlx::query_as!(
        crate::models::message::MessageWithUsers,
        r#"
        SELECT 
            m.id,
            m.sender_id,
            m.receiver_id,
            m.content,
            m.message_type,
            m.attachment_url,
            m.attachment_name,
            m.is_broadcast,
            m.is_read,
            m.created_at,
            m.updated_at,
            s.id as "sender_id",
            s.name as "sender_name",
            s.avatar as "sender_avatar",
            r.id as "receiver_id",
            r.name as "receiver_name",
            r.avatar as "receiver_avatar"
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.receiver_id = r.id
        WHERE m.id = $1
        "#,
        message_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(message)
}
