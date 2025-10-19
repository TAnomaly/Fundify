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
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::services::goal_service::{
    create_goal, delete_goal, get_creator_goals, get_goal_by_id, update_goal, update_goal_progress,
    GoalCreateRequest, GoalResponse, GoalUpdateRequest, GoalProgressUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/goals", post(handle_create_goal))
        .route("/goals/creator/:creator_id", get(handle_get_creator_goals))
        .route("/goals/:id", get(handle_get_goal_by_id).put(handle_update_goal).delete(handle_delete_goal))
        .route("/goals/:id/progress", put(handle_update_goal_progress))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateGoalRequest {
    #[validate(length(min = 3, max = 200))]
    title: String,
    #[validate(length(min = 10, max = 1000))]
    description: String,
    #[validate(range(min = 1.0))]
    target_amount: f64,
    #[validate(length(min = 3, max = 10))]
    currency: String,
    #[validate(url)]
    cover_image: String,
    #[serde(default)]
    deadline: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(default)]
    is_public: bool,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateGoalRequest {
    #[validate(length(min = 3, max = 200))]
    title: Option<String>,
    #[validate(length(min = 10, max = 1000))]
    description: Option<String>,
    #[validate(range(min = 1.0))]
    target_amount: Option<f64>,
    #[validate(length(min = 3, max = 10))]
    currency: Option<String>,
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    deadline: Option<Option<chrono::DateTime<chrono::Utc>>>,
    #[serde(default)]
    is_public: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateGoalProgressRequest {
    #[validate(range(min = 0.0))]
    current_amount: f64,
    #[validate(length(max = 500))]
    update_message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreatorGoalsQuery {
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
}

async fn handle_create_goal(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateGoalRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = GoalCreateRequest {
        title: body.title,
        description: body.description,
        target_amount: body.target_amount,
        currency: body.currency,
        cover_image: body.cover_image,
        deadline: body.deadline,
        is_public: body.is_public,
        creator_id: user_id,
    };

    let goal = create_goal(&state, input).await?;
    Ok((StatusCode::CREATED, Json(goal)))
}

async fn handle_get_creator_goals(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(creator_id): Path<Uuid>,
    Query(query): Query<CreatorGoalsQuery>,
) -> Result<Json<Vec<GoalResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let status = query.status;
    let goals = get_creator_goals(&state, creator_id, page, limit, status).await?;
    Ok(Json(goals))
}

async fn handle_get_goal_by_id(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<GoalResponse>, AppError> {
    let goal = get_goal_by_id(&state, id).await?;
    Ok(Json(goal))
}

async fn handle_update_goal(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateGoalRequest>,
) -> Result<Json<GoalResponse>, AppError> {
    body.validate()?;

    let input = GoalUpdateRequest {
        title: body.title,
        description: body.description,
        target_amount: body.target_amount,
        currency: body.currency,
        cover_image: body.cover_image,
        deadline: body.deadline,
        is_public: body.is_public,
    };

    let goal = update_goal(&state, user_id, id, input).await?;
    Ok(Json(goal))
}

async fn handle_update_goal_progress(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateGoalProgressRequest>,
) -> Result<Json<GoalResponse>, AppError> {
    body.validate()?;

    let input = GoalProgressUpdateRequest {
        current_amount: body.current_amount,
        update_message: body.update_message,
    };

    let goal = update_goal_progress(&state, user_id, id, input).await?;
    Ok(Json(goal))
}

async fn handle_delete_goal(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_goal(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
