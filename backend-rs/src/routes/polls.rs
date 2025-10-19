use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    models::poll::{
        CreatePollRequest, PollResponse, PollsListResponse, VoteRequest,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

#[derive(Debug, Deserialize)]
pub struct PollQuery {
    pub creator_id: Option<Uuid>,
}

pub fn polls_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_poll))
        .route("/creator/:creator_id", get(get_creator_polls))
        .route("/:id", get(get_poll_by_id))
        .route("/:id/vote", post(vote_on_poll))
        .route("/:id", delete(delete_poll))
        .route("/:id/close", put(close_poll))
}

async fn create_poll(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreatePollRequest>,
) -> Result<Json<PollResponse>, (StatusCode, Json<serde_json::Value>)> {
    if payload.options.len() < 2 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "At least 2 options are required"
            })),
        ));
    }

    let poll_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO polls (id, question, options, expires_at, multiple_choice, is_public, minimum_tier_id, creator_id, is_closed, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10)",
        poll_id,
        payload.question,
        &payload.options,
        payload.expires_at,
        payload.multiple_choice.unwrap_or(false),
        payload.is_public.unwrap_or(false),
        payload.minimum_tier_id,
        user.id,
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
                "message": "Failed to create poll"
            })),
        )
    })?;

    // Fetch the created poll with stats
    let poll_with_stats = get_poll_with_stats(&state, poll_id, Some(user.id)).await?;

    Ok(Json(PollResponse {
        success: true,
        message: Some("Poll created successfully".to_string()),
        data: Some(poll_with_stats),
    }))
}

async fn get_creator_polls(
    State(state): State<AppState>,
    Path(creator_id): Path<Uuid>,
    Query(_params): Query<PollQuery>,
) -> Result<Json<PollsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let polls = sqlx::query_as!(
        crate::models::poll::Poll,
        "SELECT * FROM polls WHERE creator_id = $1 ORDER BY created_at DESC",
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

    let mut polls_with_stats = Vec::new();
    for poll in polls {
        let poll_with_stats = get_poll_with_stats(&state, poll.id, None).await?;
        polls_with_stats.push(poll_with_stats);
    }

    Ok(Json(PollsListResponse {
        success: true,
        data: polls_with_stats,
    }))
}

async fn get_poll_by_id(
    State(state): State<AppState>,
    Path(poll_id): Path<Uuid>,
) -> Result<Json<PollResponse>, (StatusCode, Json<serde_json::Value>)> {
    let poll_with_stats = get_poll_with_stats(&state, poll_id, None).await?;

    Ok(Json(PollResponse {
        success: true,
        message: None,
        data: Some(poll_with_stats),
    }))
}

async fn vote_on_poll(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(poll_id): Path<Uuid>,
    Json(payload): Json<VoteRequest>,
) -> Result<Json<PollResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if poll exists and is not closed
    let poll = sqlx::query!(
        "SELECT id, multiple_choice, is_closed, expires_at FROM polls WHERE id = $1",
        poll_id
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

    if let Some(poll) = poll {
        if poll.is_closed {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Poll is closed"
                })),
            ));
        }

        if let Some(expires_at) = poll.expires_at {
            if expires_at < chrono::Utc::now() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Poll has expired"
                    })),
                ));
            }
        }

        if !poll.multiple_choice && payload.options.len() > 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "This poll only allows single choice"
                })),
            ));
        }

        // Check if user already voted
        let existing_vote = sqlx::query!(
            "SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2",
            poll_id,
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

        if existing_vote.is_some() {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "You have already voted on this poll"
                })),
            ));
        }

        // Create vote
        let vote_id = Uuid::new_v4();
        let now = chrono::Utc::now();

        sqlx::query!(
            "INSERT INTO poll_votes (id, poll_id, user_id, options, created_at) VALUES ($1, $2, $3, $4, $5)",
            vote_id,
            poll_id,
            user.id,
            &payload.options,
            now
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to record vote"
                })),
            )
        })?;

        // Fetch updated poll with stats
        let poll_with_stats = get_poll_with_stats(&state, poll_id, Some(user.id)).await?;

        Ok(Json(PollResponse {
            success: true,
            message: Some("Vote recorded successfully".to_string()),
            data: Some(poll_with_stats),
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Poll not found"
            })),
        ))
    }
}

async fn delete_poll(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(poll_id): Path<Uuid>,
) -> Result<Json<PollResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if poll exists and user is creator
    let poll = sqlx::query!(
        "SELECT id, creator_id FROM polls WHERE id = $1",
        poll_id
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

    if let Some(poll) = poll {
        if poll.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to delete this poll"
                })),
            ));
        }

        // Delete poll (cascade will delete votes)
        sqlx::query!("DELETE FROM polls WHERE id = $1", poll_id)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to delete poll"
                    })),
                )
            })?;

        Ok(Json(PollResponse {
            success: true,
            message: Some("Poll deleted successfully".to_string()),
            data: None,
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Poll not found"
            })),
        ))
    }
}

async fn close_poll(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(poll_id): Path<Uuid>,
) -> Result<Json<PollResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if poll exists and user is creator
    let poll = sqlx::query!(
        "SELECT id, creator_id FROM polls WHERE id = $1",
        poll_id
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

    if let Some(poll) = poll {
        if poll.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to close this poll"
                })),
            ));
        }

        // Close poll
        sqlx::query!(
            "UPDATE polls SET is_closed = true, updated_at = $1 WHERE id = $2",
            chrono::Utc::now(),
            poll_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to close poll"
                })),
            )
        })?;

        // Fetch updated poll with stats
        let poll_with_stats = get_poll_with_stats(&state, poll_id, Some(user.id)).await?;

        Ok(Json(PollResponse {
            success: true,
            message: Some("Poll closed successfully".to_string()),
            data: Some(poll_with_stats),
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Poll not found"
            })),
        ))
    }
}

async fn get_poll_with_stats(
    state: &AppState,
    poll_id: Uuid,
    user_id: Option<Uuid>,
) -> Result<crate::models::poll::PollWithStats, (StatusCode, Json<serde_json::Value>)> {
    let poll = sqlx::query_as!(
        crate::models::poll::Poll,
        "SELECT * FROM polls WHERE id = $1",
        poll_id
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

    // Get total votes
    let total_votes = sqlx::query!(
        "SELECT COUNT(*) as count FROM poll_votes WHERE poll_id = $1",
        poll_id
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

    // Get user's vote if user_id is provided
    let user_vote = if let Some(user_id) = user_id {
        sqlx::query!(
            "SELECT options FROM poll_votes WHERE poll_id = $1 AND user_id = $2",
            poll_id,
            user_id
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
        })?
        .map(|row| row.options)
    } else {
        None
    };

    // Get option votes
    let option_votes = sqlx::query_as!(
        crate::models::poll::OptionVote,
        r#"
        SELECT 
            option,
            COUNT(*) as votes
        FROM poll_votes pv,
        UNNEST(pv.options) as option
        WHERE pv.poll_id = $1
        GROUP BY option
        ORDER BY votes DESC
        "#,
        poll_id
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

    Ok(crate::models::poll::PollWithStats {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        expires_at: poll.expires_at,
        multiple_choice: poll.multiple_choice,
        is_public: poll.is_public,
        minimum_tier_id: poll.minimum_tier_id,
        creator_id: poll.creator_id,
        is_closed: poll.is_closed,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        total_votes: total_votes.count.unwrap_or(0),
        user_vote,
        option_votes,
    })
}
