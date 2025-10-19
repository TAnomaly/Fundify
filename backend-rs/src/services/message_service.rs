use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct MessageCreateRequest {
    pub content: String,
    pub sender_id: Uuid,
    pub recipient_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub message_type: String, // 'DIRECT' or 'BROADCAST'
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub content: String,
    pub sender_id: Uuid,
    pub recipient_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub message_type: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
    pub sender: MessageUser,
    pub recipient: Option<MessageUser>,
}

#[derive(Debug, Serialize)]
pub struct MessageUser {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConversationResponse {
    pub other_user: MessageUser,
    pub last_message: Option<MessageResponse>,
    pub unread_count: i64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct BroadcastMessageResponse {
    pub id: Uuid,
    pub content: String,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub creator: MessageUser,
}

pub async fn send_message(
    state: &SharedState,
    input: MessageCreateRequest,
) -> Result<MessageResponse, AppError> {
    let message_id = Uuid::new_v4();
    
    let message = sqlx::query!(
        r#"
        INSERT INTO messages (
            id, content, sender_id, recipient_id, creator_id, 
            message_type, is_read, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
        RETURNING *
        "#,
        message_id,
        input.content,
        input.sender_id,
        input.recipient_id,
        input.creator_id,
        input.message_type
    )
    .fetch_one(&state.db_pool)
    .await?;

    // Get sender info
    let sender = sqlx::query!(
        "SELECT id, name, avatar FROM users WHERE id = $1",
        input.sender_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    // Get recipient info if exists
    let recipient = if let Some(recipient_id) = input.recipient_id {
        let user = sqlx::query!(
            "SELECT id, name, avatar FROM users WHERE id = $1",
            recipient_id
        )
        .fetch_optional(&state.db_pool)
        .await?;
        
        user.map(|u| MessageUser {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
        })
    } else {
        None
    };

    Ok(MessageResponse {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        recipient_id: message.recipient_id,
        creator_id: message.creator_id,
        message_type: message.message_type,
        is_read: message.is_read,
        created_at: message.created_at,
        sender: MessageUser {
            id: sender.id,
            name: sender.name,
            avatar: sender.avatar,
        },
        recipient,
    })
}

pub async fn get_user_conversations(
    state: &SharedState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<ConversationResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let conversations = sqlx::query!(
        r#"
        WITH conversation_partners AS (
            SELECT DISTINCT 
                CASE 
                    WHEN sender_id = $1 THEN recipient_id 
                    ELSE sender_id 
                END as other_user_id,
                MAX(created_at) as last_message_time
            FROM messages 
            WHERE sender_id = $1 OR recipient_id = $1
            GROUP BY other_user_id
        )
        SELECT 
            u.id as other_user_id,
            u.name as other_user_name,
            u.avatar as other_user_avatar,
            cp.last_message_time,
            COUNT(CASE WHEN m.recipient_id = $1 AND m.is_read = false THEN 1 END) as unread_count
        FROM conversation_partners cp
        JOIN users u ON cp.other_user_id = u.id
        LEFT JOIN messages m ON (m.sender_id = cp.other_user_id AND m.recipient_id = $1)
        GROUP BY u.id, u.name, u.avatar, cp.last_message_time
        ORDER BY cp.last_message_time DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for conv in conversations {
        result.push(ConversationResponse {
            other_user: MessageUser {
                id: conv.other_user_id,
                name: conv.other_user_name,
                avatar: conv.other_user_avatar,
            },
            last_message: None, // TODO: Get last message
            unread_count: conv.unread_count.unwrap_or(0),
            updated_at: conv.last_message_time.unwrap_or(Utc::now()),
        });
    }

    Ok(result)
}

pub async fn get_conversation(
    state: &SharedState,
    user_id: Uuid,
    other_user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<MessageResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let messages = sqlx::query!(
        r#"
        SELECT m.*, 
               s.name as sender_name, s.avatar as sender_avatar,
               r.name as recipient_name, r.avatar as recipient_avatar
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.recipient_id = r.id
        WHERE (m.sender_id = $1 AND m.recipient_id = $2) 
           OR (m.sender_id = $2 AND m.recipient_id = $1)
        ORDER BY m.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
        user_id,
        other_user_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for msg in messages {
        result.push(MessageResponse {
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            recipient_id: msg.recipient_id,
            creator_id: msg.creator_id,
            message_type: msg.message_type,
            is_read: msg.is_read,
            created_at: msg.created_at,
            sender: MessageUser {
                id: msg.sender_id,
                name: msg.sender_name,
                avatar: msg.sender_avatar,
            },
            recipient: msg.recipient_id.map(|id| MessageUser {
                id,
                name: msg.recipient_name.unwrap_or_default(),
                avatar: msg.recipient_avatar,
            }),
        });
    }

    Ok(result)
}

pub async fn get_broadcast_messages(
    state: &SharedState,
    user_id: Uuid,
    creator_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<BroadcastMessageResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let messages = sqlx::query!(
        r#"
        SELECT m.*, u.name as creator_name, u.avatar as creator_avatar
        FROM messages m
        JOIN users u ON m.creator_id = u.id
        WHERE m.creator_id = $1 AND m.message_type = 'BROADCAST'
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        creator_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for msg in messages {
        result.push(BroadcastMessageResponse {
            id: msg.id,
            content: msg.content,
            creator_id: msg.creator_id.unwrap_or(creator_id),
            created_at: msg.created_at,
            creator: MessageUser {
                id: msg.creator_id.unwrap_or(creator_id),
                name: msg.creator_name,
                avatar: msg.creator_avatar,
            },
        });
    }

    Ok(result)
}

pub async fn mark_message_as_read(
    state: &SharedState,
    user_id: Uuid,
    message_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        "UPDATE messages SET is_read = true WHERE id = $1 AND recipient_id = $2",
        message_id,
        user_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn delete_message(
    state: &SharedState,
    user_id: Uuid,
    message_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        "DELETE FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)",
        message_id,
        user_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn get_unread_count(
    state: &SharedState,
    user_id: Uuid,
) -> Result<i64, AppError> {
    let count = sqlx::query!(
        "SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false",
        user_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(count.count.unwrap_or(0))
}
