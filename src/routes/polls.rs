use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::services::poll_service::{
    close_poll, create_poll, delete_poll, get_creator_polls, get_poll_by_id, vote_on_poll,
    PollCreateRequest, PollResponse, PollVoteRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/polls", post(handle_create_poll))
        .route("/polls/creator/:creator_id", get(handle_get_creator_polls))
        .route("/polls/:id", get(handle_get_poll_by_id).delete(handle_delete_poll))
        .route("/polls/:id/vote", post(handle_vote_on_poll))
        .route("/polls/:id/close", put(handle_close_poll))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreatePollRequest {
    #[validate(length(min = 3, max = 500))]
    question: String,
    #[validate(length(min = 2, max = 10))]
    options: Vec<String>,
    expires_at: Option<DateTime<Utc>>,
    multiple_choice: Option<bool>,
    is_public: Option<bool>,
    minimum_tier_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct VoteRequest {
    option_index: u32,
}

#[derive(Debug, Deserialize)]
struct CreatorPollsQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn handle_create_poll(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreatePollRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = PollCreateRequest {
        question: body.question,
        options: body.options,
        expires_at: body.expires_at,
        multiple_choice: body.multiple_choice.unwrap_or(false),
        is_public: body.is_public.unwrap_or(false),
        minimum_tier_id: body.minimum_tier_id,
        creator_id: user_id,
    };

    let poll = create_poll(&state, input).await?;
    Ok((StatusCode::CREATED, Json(poll)))
}

async fn handle_get_creator_polls(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(creator_id): Path<Uuid>,
    Query(query): Query<CreatorPollsQuery>,
) -> Result<Json<Vec<PollResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let polls = get_creator_polls(&state, creator_id, page, limit).await?;
    Ok(Json(polls))
}

async fn handle_get_poll_by_id(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<PollResponse>, AppError> {
    let poll = get_poll_by_id(&state, id).await?;
    Ok(Json(poll))
}

async fn handle_vote_on_poll(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<VoteRequest>,
) -> Result<impl IntoResponse, AppError> {
    let input = PollVoteRequest {
        poll_id: id,
        user_id,
        option_index: body.option_index,
    };

    vote_on_poll(&state, input).await?;
    Ok(StatusCode::OK)
}

async fn handle_delete_poll(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_poll(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn handle_close_poll(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    close_poll(&state, user_id, id).await?;
    Ok(StatusCode::OK)
}
