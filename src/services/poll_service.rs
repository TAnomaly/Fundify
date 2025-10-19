use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct PollCreateRequest {
    pub question: String,
    pub options: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub multiple_choice: bool,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct PollVoteRequest {
    pub poll_id: Uuid,
    pub user_id: Uuid,
    pub option_index: u32,
}

#[derive(Debug, Serialize)]
pub struct PollResponse {
    pub id: Uuid,
    pub question: String,
    pub options: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub multiple_choice: bool,
    pub is_public: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub is_active: bool,
    pub total_votes: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub vote_counts: std::collections::HashMap<u32, i32>,
    pub user_voted_index: Option<u32>,
    pub has_voted: bool,
    pub creator: PollCreator,
}

#[derive(Debug, Serialize)]
pub struct PollCreator {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

pub async fn create_poll(
    state: &SharedState,
    input: PollCreateRequest,
) -> Result<PollResponse, AppError> {
    let poll_id = Uuid::new_v4();
    
    let poll = sqlx::query!(
        r#"
        INSERT INTO polls (
            id, question, options, expires_at, multiple_choice, 
            is_public, minimum_tier_id, creator_id, is_active, 
            total_votes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 0, NOW(), NOW())
        RETURNING *
        "#,
        poll_id,
        input.question,
        &input.options,
        input.expires_at,
        input.multiple_choice,
        input.is_public,
        input.minimum_tier_id,
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    let creator = sqlx::query!(
        "SELECT id, name, avatar FROM users WHERE id = $1",
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(PollResponse {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        expires_at: poll.expires_at,
        multiple_choice: poll.multiple_choice,
        is_public: poll.is_public,
        minimum_tier_id: poll.minimum_tier_id,
        creator_id: poll.creator_id,
        is_active: poll.is_active,
        total_votes: poll.total_votes,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        vote_counts: std::collections::HashMap::new(),
        user_voted_index: None,
        has_voted: false,
        creator: PollCreator {
            id: creator.id,
            name: creator.name,
            avatar: creator.avatar,
        },
    })
}

pub async fn get_creator_polls(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<PollResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let polls = sqlx::query!(
        r#"
        SELECT p.*, u.name as creator_name, u.avatar as creator_avatar
        FROM polls p
        JOIN users u ON p.creator_id = u.id
        WHERE p.creator_id = $1 AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        creator_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for poll in polls {
        let vote_counts = get_vote_counts(state, poll.id).await?;
        
        result.push(PollResponse {
            id: poll.id,
            question: poll.question,
            options: poll.options,
            expires_at: poll.expires_at,
            multiple_choice: poll.multiple_choice,
            is_public: poll.is_public,
            minimum_tier_id: poll.minimum_tier_id,
            creator_id: poll.creator_id,
            is_active: poll.is_active,
            total_votes: poll.total_votes,
            created_at: poll.created_at,
            updated_at: poll.updated_at,
            vote_counts,
            user_voted_index: None,
            has_voted: false,
            creator: PollCreator {
                id: poll.creator_id,
                name: poll.creator_name,
                avatar: poll.creator_avatar,
            },
        });
    }

    Ok(result)
}

pub async fn get_poll_by_id(
    state: &SharedState,
    poll_id: Uuid,
) -> Result<PollResponse, AppError> {
    let poll = sqlx::query!(
        r#"
        SELECT p.*, u.name as creator_name, u.avatar as creator_avatar
        FROM polls p
        JOIN users u ON p.creator_id = u.id
        WHERE p.id = $1
        "#,
        poll_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let poll = match poll {
        Some(p) => p,
        None => return Err(AppError::NotFound("Poll not found".to_string())),
    };

    let vote_counts = get_vote_counts(state, poll_id).await?;

    Ok(PollResponse {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        expires_at: poll.expires_at,
        multiple_choice: poll.multiple_choice,
        is_public: poll.is_public,
        minimum_tier_id: poll.minimum_tier_id,
        creator_id: poll.creator_id,
        is_active: poll.is_active,
        total_votes: poll.total_votes,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        vote_counts,
        user_voted_index: None,
        has_voted: false,
        creator: PollCreator {
            id: poll.creator_id,
            name: poll.creator_name,
            avatar: poll.creator_avatar,
        },
    })
}

pub async fn vote_on_poll(
    state: &SharedState,
    input: PollVoteRequest,
) -> Result<(), AppError> {
    // Get poll
    let poll = sqlx::query!(
        "SELECT * FROM polls WHERE id = $1",
        input.poll_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let poll = match poll {
        Some(p) => p,
        None => return Err(AppError::NotFound("Poll not found".to_string())),
    };

    // Check if poll is active
    if !poll.is_active {
        return Err(AppError::BadRequest("Poll is closed".to_string()));
    }

    // Check if poll expired
    if let Some(expires_at) = poll.expires_at {
        if Utc::now() > expires_at {
            return Err(AppError::BadRequest("Poll has expired".to_string()));
        }
    }

    // Validate option index
    if input.option_index as usize >= poll.options.len() {
        return Err(AppError::BadRequest("Invalid option index".to_string()));
    }

    // Check if user already voted
    let existing_vote = sqlx::query!(
        "SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2",
        input.poll_id,
        input.user_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    if existing_vote.is_some() && !poll.multiple_choice {
        return Err(AppError::BadRequest(
            "You have already voted on this poll".to_string(),
        ));
    }

    // Create vote
    sqlx::query!(
        r#"
        INSERT INTO poll_votes (id, poll_id, user_id, option_index, option_text, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        "#,
        Uuid::new_v4(),
        input.poll_id,
        input.user_id,
        input.option_index as i32,
        poll.options[input.option_index as usize].clone()
    )
    .execute(&state.db_pool)
    .await?;

    // Update total votes count
    sqlx::query!(
        "UPDATE polls SET total_votes = total_votes + 1 WHERE id = $1",
        input.poll_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn delete_poll(
    state: &SharedState,
    user_id: Uuid,
    poll_id: Uuid,
) -> Result<(), AppError> {
    let poll = sqlx::query!(
        "SELECT creator_id FROM polls WHERE id = $1",
        poll_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let poll = match poll {
        Some(p) => p,
        None => return Err(AppError::NotFound("Poll not found".to_string())),
    };

    if poll.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!("DELETE FROM polls WHERE id = $1", poll_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}

pub async fn close_poll(
    state: &SharedState,
    user_id: Uuid,
    poll_id: Uuid,
) -> Result<(), AppError> {
    let poll = sqlx::query!(
        "SELECT creator_id FROM polls WHERE id = $1",
        poll_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let poll = match poll {
        Some(p) => p,
        None => return Err(AppError::NotFound("Poll not found".to_string())),
    };

    if poll.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!(
        "UPDATE polls SET is_active = false WHERE id = $1",
        poll_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

async fn get_vote_counts(state: &SharedState, poll_id: Uuid) -> Result<std::collections::HashMap<u32, i32>, AppError> {
    let votes = sqlx::query!(
        "SELECT option_index FROM poll_votes WHERE poll_id = $1",
        poll_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut counts = std::collections::HashMap::new();
    for vote in votes {
        let index = vote.option_index as u32;
        *counts.entry(index).or_insert(0) += 1;
    }

    Ok(counts)
}
