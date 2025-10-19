use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    models::withdrawal::{
        CreateWithdrawalRequest, UpdateWithdrawalRequest, WithdrawalResponse,
        WithdrawalsListResponse, WithdrawalsWithUserListResponse,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

#[derive(Debug, Deserialize)]
pub struct WithdrawalQuery {
    pub status: Option<String>,
}

pub fn withdrawals_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_withdrawal))
        .route("/my", get(get_my_withdrawals))
        .route("/", get(get_all_withdrawals))
        .route("/:id", put(update_withdrawal))
}

async fn create_withdrawal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateWithdrawalRequest>,
) -> Result<Json<WithdrawalResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if campaign exists and user is the creator
    let campaign = sqlx::query!(
        "SELECT id, creator_id, current_amount FROM campaigns WHERE id = $1",
        payload.campaign_id
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

    if let Some(campaign) = campaign {
        if campaign.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Only campaign creator can request withdrawal"
                })),
            );
        }

        // Check if requested amount is available
        if payload.amount > campaign.current_amount {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Insufficient funds in campaign"
                })),
            ));
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Campaign not found"
            })),
        ));
    }

    // Check for pending withdrawals
    let pending_withdrawal = sqlx::query!(
        "SELECT id FROM withdrawals WHERE campaign_id = $1 AND status = 'PENDING'",
        payload.campaign_id
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

    if pending_withdrawal.is_some() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "There is already a pending withdrawal for this campaign"
            })),
        ));
    }

    // Create the withdrawal
    let withdrawal_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO withdrawals (id, amount, bank_account, notes, status, user_id, campaign_id, requested_at, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9)",
        withdrawal_id,
        payload.amount,
        payload.bank_account,
        payload.notes,
        user.id,
        payload.campaign_id,
        now,
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
                "message": "Failed to create withdrawal"
            })),
        )
    })?;

    // Fetch the created withdrawal with campaign info
    let withdrawal_with_campaign = sqlx::query_as!(
        crate::models::withdrawal::WithdrawalWithCampaign,
        r#"
        SELECT 
            w.id,
            w.amount,
            w.bank_account,
            w.notes,
            w.status,
            w.user_id,
            w.campaign_id,
            w.requested_at,
            w.processed_at,
            w.created_at,
            w.updated_at,
            c.id as "campaign_id",
            c.title as "campaign_title",
            c.slug as "campaign_slug"
        FROM withdrawals w
        JOIN campaigns c ON w.campaign_id = c.id
        WHERE w.id = $1
        "#,
        withdrawal_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to fetch created withdrawal"
            })),
        )
    })?;

    Ok(Json(WithdrawalResponse {
        success: true,
        message: "Withdrawal request created successfully".to_string(),
        data: Some(withdrawal_with_campaign),
    }))
}

async fn get_my_withdrawals(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Query(params): Query<WithdrawalQuery>,
) -> Result<Json<WithdrawalsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let mut query = "SELECT w.*, c.id as campaign_id, c.title as campaign_title, c.slug as campaign_slug 
                     FROM withdrawals w 
                     JOIN campaigns c ON w.campaign_id = c.id 
                     WHERE w.user_id = $1".to_string();
    let mut bind_params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = vec![Box::new(user.id)];

    if let Some(status) = &params.status {
        query.push_str(" AND w.status = $2");
        bind_params.push(Box::new(status.clone()));
    }

    query.push_str(" ORDER BY w.requested_at DESC");

    let withdrawals = sqlx::query_as!(
        crate::models::withdrawal::WithdrawalWithCampaign,
        &query,
        user.id,
        params.status.as_deref()
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

    Ok(Json(WithdrawalsListResponse {
        success: true,
        data: withdrawals,
    }))
}

async fn get_all_withdrawals(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Query(params): Query<WithdrawalQuery>,
) -> Result<Json<WithdrawalsWithUserListResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if user is admin
    if user.role != "ADMIN" {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Admin access required"
            })),
        ));
    }

    let mut query = "SELECT w.*, u.id as user_id, u.name as user_name, u.email as user_email, 
                     c.id as campaign_id, c.title as campaign_title, c.slug as campaign_slug 
                     FROM withdrawals w 
                     JOIN users u ON w.user_id = u.id 
                     JOIN campaigns c ON w.campaign_id = c.id".to_string();
    let mut bind_params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = vec![];

    if let Some(status) = &params.status {
        query.push_str(" WHERE w.status = $1");
        bind_params.push(Box::new(status.clone()));
    }

    query.push_str(" ORDER BY w.requested_at DESC");

    let withdrawals = sqlx::query_as!(
        crate::models::withdrawal::WithdrawalWithUserAndCampaign,
        &query,
        params.status.as_deref()
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

    Ok(Json(WithdrawalsWithUserListResponse {
        success: true,
        data: withdrawals,
    }))
}

async fn update_withdrawal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(withdrawal_id): Path<Uuid>,
    Json(payload): Json<UpdateWithdrawalRequest>,
) -> Result<Json<WithdrawalResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if user is admin
    if user.role != "ADMIN" {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "success": false,
                "message": "Admin access required"
            })),
        ));
    }

    // Check if withdrawal exists
    let withdrawal = sqlx::query!(
        "SELECT id, status, amount, campaign_id FROM withdrawals WHERE id = $1",
        withdrawal_id
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

    if let Some(withdrawal) = withdrawal {
        // If completing the withdrawal, deduct from campaign amount
        if payload.status == "COMPLETED" && withdrawal.status != "COMPLETED" {
            let now = chrono::Utc::now();
            
            // Start transaction
            let mut tx = state.pool.begin().await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to start transaction"
                    })),
                )
            })?;

            // Update withdrawal
            sqlx::query!(
                "UPDATE withdrawals SET status = $1, notes = $2, processed_at = $3, updated_at = $4 WHERE id = $5",
                payload.status,
                payload.notes,
                now,
                now,
                withdrawal_id
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to update withdrawal"
                    })),
                )
            })?;

            // Deduct from campaign
            sqlx::query!(
                "UPDATE campaigns SET current_amount = current_amount - $1, updated_at = $2 WHERE id = $3",
                withdrawal.amount,
                now,
                withdrawal.campaign_id
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to update campaign amount"
                    })),
                )
            })?;

            // Commit transaction
            tx.commit().await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to commit transaction"
                    })),
                )
            })?;
        } else {
            // Just update the withdrawal status
            let now = chrono::Utc::now();
            let processed_at = if payload.status != "PENDING" { Some(now) } else { None };

            sqlx::query!(
                "UPDATE withdrawals SET status = $1, notes = $2, processed_at = $3, updated_at = $4 WHERE id = $5",
                payload.status,
                payload.notes,
                processed_at,
                now,
                withdrawal_id
            )
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to update withdrawal"
                    })),
                )
            })?;
        }
    } else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Withdrawal not found"
            })),
        ));
    }

    // Fetch the updated withdrawal with campaign info
    let withdrawal_with_campaign = sqlx::query_as!(
        crate::models::withdrawal::WithdrawalWithCampaign,
        r#"
        SELECT 
            w.id,
            w.amount,
            w.bank_account,
            w.notes,
            w.status,
            w.user_id,
            w.campaign_id,
            w.requested_at,
            w.processed_at,
            w.created_at,
            w.updated_at,
            c.id as "campaign_id",
            c.title as "campaign_title",
            c.slug as "campaign_slug"
        FROM withdrawals w
        JOIN campaigns c ON w.campaign_id = c.id
        WHERE w.id = $1
        "#,
        withdrawal_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to fetch updated withdrawal"
            })),
        )
    })?;

    Ok(Json(WithdrawalResponse {
        success: true,
        message: "Withdrawal updated successfully".to_string(),
        data: Some(withdrawal_with_campaign),
    }))
}
