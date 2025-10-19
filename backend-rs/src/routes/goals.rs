use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use uuid::Uuid;

use crate::{
    models::goal::{
        CreateGoalRequest, GoalResponse, GoalsListResponse, UpdateGoalProgressRequest,
        UpdateGoalRequest,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

pub fn goals_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_goal))
        .route("/creator/:creator_id", get(get_creator_goals))
        .route("/:id", get(get_goal_by_id))
        .route("/:id", put(update_goal))
        .route("/:id/progress", put(update_goal_progress))
        .route("/:id", delete(delete_goal))
}

async fn create_goal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateGoalRequest>,
) -> Result<Json<GoalResponse>, (StatusCode, Json<serde_json::Value>)> {
    let goal_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO goals (id, title, description, goal_type, target_amount, current_amount, reward_description, deadline, is_public, is_completed, creator_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, 0.0, $6, $7, $8, false, $9, $10, $11)",
        goal_id,
        payload.title,
        payload.description,
        payload.goal_type.unwrap_or_else(|| "REVENUE".to_string()),
        payload.target_amount,
        payload.reward_description,
        payload.deadline,
        payload.is_public.unwrap_or(true),
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
                "message": "Failed to create goal"
            })),
        )
    })?;

    // Fetch the created goal with creator info
    let goal_with_creator = get_goal_with_creator(&state, goal_id).await?;

    Ok(Json(GoalResponse {
        success: true,
        message: Some("Goal created successfully".to_string()),
        data: Some(goal_with_creator),
    }))
}

async fn get_creator_goals(
    State(state): State<AppState>,
    Path(creator_id): Path<Uuid>,
) -> Result<Json<GoalsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let goals = sqlx::query_as!(
        crate::models::goal::Goal,
        "SELECT * FROM goals WHERE creator_id = $1 ORDER BY created_at DESC",
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

    let mut goals_with_creator = Vec::new();
    for goal in goals {
        let goal_with_creator = get_goal_with_creator(&state, goal.id).await?;
        goals_with_creator.push(goal_with_creator);
    }

    Ok(Json(GoalsListResponse {
        success: true,
        data: goals_with_creator,
    }))
}

async fn get_goal_by_id(
    State(state): State<AppState>,
    Path(goal_id): Path<Uuid>,
) -> Result<Json<GoalResponse>, (StatusCode, Json<serde_json::Value>)> {
    let goal_with_creator = get_goal_with_creator(&state, goal_id).await?;

    Ok(Json(GoalResponse {
        success: true,
        message: None,
        data: Some(goal_with_creator),
    }))
}

async fn update_goal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(goal_id): Path<Uuid>,
    Json(payload): Json<UpdateGoalRequest>,
) -> Result<Json<GoalResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if goal exists and user is creator
    let goal = sqlx::query!(
        "SELECT id, creator_id FROM goals WHERE id = $1",
        goal_id
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

    if let Some(goal) = goal {
        if goal.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to update this goal"
                })),
            ));
        }

        // Build update query dynamically
        let mut update_fields = Vec::new();
        let mut bind_params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = vec![];
        let mut param_count = 1;

        if let Some(title) = &payload.title {
            update_fields.push(format!("title = ${}", param_count));
            bind_params.push(Box::new(title.clone()));
            param_count += 1;
        }

        if let Some(description) = &payload.description {
            update_fields.push(format!("description = ${}", param_count));
            bind_params.push(Box::new(description.clone()));
            param_count += 1;
        }

        if let Some(target_amount) = payload.target_amount {
            update_fields.push(format!("target_amount = ${}", param_count));
            bind_params.push(Box::new(target_amount));
            param_count += 1;
        }

        if let Some(reward_description) = &payload.reward_description {
            update_fields.push(format!("reward_description = ${}", param_count));
            bind_params.push(Box::new(reward_description.clone()));
            param_count += 1;
        }

        if let Some(deadline) = payload.deadline {
            update_fields.push(format!("deadline = ${}", param_count));
            bind_params.push(Box::new(deadline));
            param_count += 1;
        }

        if let Some(is_public) = payload.is_public {
            update_fields.push(format!("is_public = ${}", param_count));
            bind_params.push(Box::new(is_public));
            param_count += 1;
        }

        if update_fields.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "No fields to update"
                })),
            ));
        }

        update_fields.push(format!("updated_at = ${}", param_count));
        bind_params.push(Box::new(chrono::Utc::now()));
        param_count += 1;

        bind_params.push(Box::new(goal_id));

        let query = format!(
            "UPDATE goals SET {} WHERE id = ${}",
            update_fields.join(", "),
            param_count
        );

        // Execute the update
        sqlx::query(&query)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to update goal"
                    })),
                )
            })?;

        // Fetch the updated goal with creator info
        let goal_with_creator = get_goal_with_creator(&state, goal_id).await?;

        Ok(Json(GoalResponse {
            success: true,
            message: Some("Goal updated successfully".to_string()),
            data: Some(goal_with_creator),
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Goal not found"
            })),
        ))
    }
}

async fn update_goal_progress(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(goal_id): Path<Uuid>,
    Json(payload): Json<UpdateGoalProgressRequest>,
) -> Result<Json<GoalResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if goal exists and user is creator
    let goal = sqlx::query!(
        "SELECT id, creator_id, target_amount, current_amount FROM goals WHERE id = $1",
        goal_id
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

    if let Some(goal) = goal {
        if goal.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to update this goal"
                })),
            ));
        }

        let new_amount = goal.current_amount + payload.amount;
        let is_completed = new_amount >= goal.target_amount;

        // Update goal progress
        sqlx::query!(
            "UPDATE goals SET current_amount = $1, is_completed = $2, updated_at = $3 WHERE id = $4",
            new_amount,
            is_completed,
            chrono::Utc::now(),
            goal_id
        )
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Failed to update goal progress"
                })),
            )
        })?;

        // Fetch the updated goal with creator info
        let goal_with_creator = get_goal_with_creator(&state, goal_id).await?;

        Ok(Json(GoalResponse {
            success: true,
            message: Some("Goal progress updated successfully".to_string()),
            data: Some(goal_with_creator),
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Goal not found"
            })),
        ))
    }
}

async fn delete_goal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(goal_id): Path<Uuid>,
) -> Result<Json<GoalResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if goal exists and user is creator
    let goal = sqlx::query!(
        "SELECT id, creator_id FROM goals WHERE id = $1",
        goal_id
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

    if let Some(goal) = goal {
        if goal.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to delete this goal"
                })),
            ));
        }

        // Delete goal
        sqlx::query!("DELETE FROM goals WHERE id = $1", goal_id)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to delete goal"
                    })),
                )
            })?;

        Ok(Json(GoalResponse {
            success: true,
            message: Some("Goal deleted successfully".to_string()),
            data: None,
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Goal not found"
            })),
        ))
    }
}

async fn get_goal_with_creator(
    state: &AppState,
    goal_id: Uuid,
) -> Result<crate::models::goal::GoalWithCreator, (StatusCode, Json<serde_json::Value>)> {
    let goal = sqlx::query_as!(
        crate::models::goal::GoalWithCreator,
        r#"
        SELECT 
            g.id,
            g.title,
            g.description,
            g.goal_type,
            g.target_amount,
            g.current_amount,
            g.reward_description,
            g.deadline,
            g.is_public,
            g.is_completed,
            g.creator_id,
            g.created_at,
            g.updated_at,
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar"
        FROM goals g
        JOIN users u ON g.creator_id = u.id
        WHERE g.id = $1
        "#,
        goal_id
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

    Ok(goal)
}
