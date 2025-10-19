use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct GoalCreateRequest {
    pub title: String,
    pub description: String,
    pub target_amount: f64,
    pub currency: String,
    pub cover_image: String,
    pub deadline: Option<DateTime<Utc>>,
    pub is_public: bool,
    pub creator_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct GoalUpdateRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub target_amount: Option<f64>,
    pub currency: Option<String>,
    pub cover_image: Option<String>,
    pub deadline: Option<Option<DateTime<Utc>>>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct GoalProgressUpdateRequest {
    pub current_amount: f64,
    pub update_message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GoalResponse {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub currency: String,
    pub cover_image: String,
    pub deadline: Option<DateTime<Utc>>,
    pub is_public: bool,
    pub creator_id: Uuid,
    pub status: String,
    pub progress_percentage: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: GoalCreator,
}

#[derive(Debug, Serialize)]
pub struct GoalCreator {
    pub id: Uuid,
    pub name: String,
    pub avatar: Option<String>,
}

pub async fn create_goal(
    state: &SharedState,
    input: GoalCreateRequest,
) -> Result<GoalResponse, AppError> {
    let goal_id = Uuid::new_v4();
    
    let goal = sqlx::query!(
        r#"
        INSERT INTO goals (
            id, title, description, target_amount, current_amount, 
            currency, cover_image, deadline, is_public, creator_id, 
            status, progress_percentage, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 0.0, $5, $6, $7, $8, $9, 'ACTIVE', 0.0, NOW(), NOW())
        RETURNING *
        "#,
        goal_id,
        input.title,
        input.description,
        input.target_amount,
        input.currency,
        input.cover_image,
        input.deadline,
        input.is_public,
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

    Ok(GoalResponse {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        currency: goal.currency,
        cover_image: goal.cover_image,
        deadline: goal.deadline,
        is_public: goal.is_public,
        creator_id: goal.creator_id,
        status: goal.status,
        progress_percentage: goal.progress_percentage,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
        creator: GoalCreator {
            id: creator.id,
            name: creator.name,
            avatar: creator.avatar,
        },
    })
}

pub async fn get_creator_goals(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    status: Option<String>,
) -> Result<Vec<GoalResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut query = sqlx::query_as!(
        GoalResponse,
        r#"
        SELECT 
            g.*,
            u.name as creator_name,
            u.avatar as creator_avatar
        FROM goals g
        JOIN users u ON g.creator_id = u.id
        WHERE g.creator_id = $1
        "#,
        creator_id
    );

    if let Some(status_filter) = status {
        query = sqlx::query_as!(
            GoalResponse,
            r#"
            SELECT 
                g.*,
                u.name as creator_name,
                u.avatar as creator_avatar
            FROM goals g
            JOIN users u ON g.creator_id = u.id
            WHERE g.creator_id = $1 AND g.status = $2
            "#,
            creator_id,
            status_filter
        );
    }

    let goals = query
        .fetch_all(&state.db_pool)
        .await?;

    Ok(goals)
}

pub async fn get_goal_by_id(
    state: &SharedState,
    goal_id: Uuid,
) -> Result<GoalResponse, AppError> {
    let goal = sqlx::query_as!(
        GoalResponse,
        r#"
        SELECT 
            g.*,
            u.name as creator_name,
            u.avatar as creator_avatar
        FROM goals g
        JOIN users u ON g.creator_id = u.id
        WHERE g.id = $1
        "#,
        goal_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    match goal {
        Some(goal) => Ok(goal),
        None => Err(AppError::NotFound("Goal not found".to_string())),
    }
}

pub async fn update_goal(
    state: &SharedState,
    user_id: Uuid,
    goal_id: Uuid,
    input: GoalUpdateRequest,
) -> Result<GoalResponse, AppError> {
    // Check if goal exists and user owns it
    let goal = sqlx::query!(
        "SELECT creator_id FROM goals WHERE id = $1",
        goal_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let goal = match goal {
        Some(g) => g,
        None => return Err(AppError::NotFound("Goal not found".to_string())),
    };

    if goal.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    // Build dynamic update query
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(title) = input.title {
        update_fields.push(format!("title = ${}", param_count));
        params.push(Box::new(title));
        param_count += 1;
    }

    if let Some(description) = input.description {
        update_fields.push(format!("description = ${}", param_count));
        params.push(Box::new(description));
        param_count += 1;
    }

    if let Some(target_amount) = input.target_amount {
        update_fields.push(format!("target_amount = ${}", param_count));
        params.push(Box::new(target_amount));
        param_count += 1;
    }

    if let Some(currency) = input.currency {
        update_fields.push(format!("currency = ${}", param_count));
        params.push(Box::new(currency));
        param_count += 1;
    }

    if let Some(cover_image) = input.cover_image {
        update_fields.push(format!("cover_image = ${}", param_count));
        params.push(Box::new(cover_image));
        param_count += 1;
    }

    if let Some(deadline) = input.deadline {
        update_fields.push(format!("deadline = ${}", param_count));
        params.push(Box::new(deadline));
        param_count += 1;
    }

    if let Some(is_public) = input.is_public {
        update_fields.push(format!("is_public = ${}", param_count));
        params.push(Box::new(is_public));
        param_count += 1;
    }

    if update_fields.is_empty() {
        return get_goal_by_id(state, goal_id).await;
    }

    update_fields.push("updated_at = NOW()".to_string());
    update_fields.push(format!("id = ${}", param_count));
    params.push(Box::new(goal_id));

    let query_str = format!(
        "UPDATE goals SET {} WHERE id = ${} RETURNING *",
        update_fields.join(", "),
        param_count
    );

    // For now, return the existing goal (TODO: implement dynamic query)
    get_goal_by_id(state, goal_id).await
}

pub async fn update_goal_progress(
    state: &SharedState,
    user_id: Uuid,
    goal_id: Uuid,
    input: GoalProgressUpdateRequest,
) -> Result<GoalResponse, AppError> {
    // Check if goal exists and user owns it
    let goal = sqlx::query!(
        "SELECT creator_id, target_amount FROM goals WHERE id = $1",
        goal_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let goal = match goal {
        Some(g) => g,
        None => return Err(AppError::NotFound("Goal not found".to_string())),
    };

    if goal.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    let progress_percentage = (input.current_amount / goal.target_amount * 100.0).min(100.0);
    let status = if progress_percentage >= 100.0 { "COMPLETED" } else { "ACTIVE" };

    sqlx::query!(
        r#"
        UPDATE goals 
        SET current_amount = $1, progress_percentage = $2, status = $3, updated_at = NOW()
        WHERE id = $4
        "#,
        input.current_amount,
        progress_percentage,
        status,
        goal_id
    )
    .execute(&state.db_pool)
    .await?;

    get_goal_by_id(state, goal_id).await
}

pub async fn delete_goal(
    state: &SharedState,
    user_id: Uuid,
    goal_id: Uuid,
) -> Result<(), AppError> {
    let goal = sqlx::query!(
        "SELECT creator_id FROM goals WHERE id = $1",
        goal_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let goal = match goal {
        Some(g) => g,
        None => return Err(AppError::NotFound("Goal not found".to_string())),
    };

    if goal.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!("DELETE FROM goals WHERE id = $1", goal_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}
