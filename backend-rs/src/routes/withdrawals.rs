use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::membership::Withdrawal;
use crate::services::withdrawal_service::{
    create_withdrawal, list_all_withdrawals, list_user_withdrawals, update_withdrawal,
    WithdrawalCreateInput, WithdrawalUpdateInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route(
            "/withdrawals",
            post(handle_create_withdrawal).get(handle_list_all_withdrawals),
        )
        .route("/withdrawals/my", get(handle_list_my_withdrawals))
        .route("/withdrawals/:id", put(handle_update_withdrawal))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct WithdrawalRequest {
    campaign_id: Uuid,
    #[validate(range(min = 1.0))]
    amount: f64,
    #[serde(default)]
    bank_account: Option<String>,
    #[serde(default)]
    notes: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WithdrawalQuery {
    status: Option<String>,
}

async fn handle_create_withdrawal(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<WithdrawalRequest>,
) -> Result<Json<Withdrawal>, AppError> {
    body.validate()?;
    let amount_cents = (body.amount * 100.0).round() as i64;

    let withdrawal = create_withdrawal(
        &state,
        user_id,
        WithdrawalCreateInput {
            campaign_id: body.campaign_id,
            amount_cents,
            bank_account: body.bank_account.clone(),
            notes: body.notes.clone(),
        },
    )
    .await?;

    Ok(Json(withdrawal))
}

async fn handle_list_my_withdrawals(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<WithdrawalQuery>,
) -> Result<Json<Vec<Withdrawal>>, AppError> {
    let withdrawals = list_user_withdrawals(
        &state,
        user_id,
        query.status.map(|s| s.to_ascii_uppercase()),
    )
    .await?;
    Ok(Json(withdrawals))
}

async fn handle_list_all_withdrawals(
    State(state): State<SharedState>,
    AuthUser { role, .. }: AuthUser,
    Query(query): Query<WithdrawalQuery>,
) -> Result<Json<Vec<Withdrawal>>, AppError> {
    if role.to_ascii_uppercase() != "ADMIN" {
        return Err(AppError::Unauthorized);
    }

    let withdrawals =
        list_all_withdrawals(&state, query.status.map(|s| s.to_ascii_uppercase())).await?;
    Ok(Json(withdrawals))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct WithdrawalUpdateRequest {
    #[validate(length(min = 3, max = 20))]
    status: String,
    #[serde(default)]
    notes: Option<String>,
}

async fn handle_update_withdrawal(
    State(state): State<SharedState>,
    AuthUser { role, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<WithdrawalUpdateRequest>,
) -> Result<Json<Withdrawal>, AppError> {
    if role.to_ascii_uppercase() != "ADMIN" {
        return Err(AppError::Unauthorized);
    }

    body.validate()?;

    let withdrawal = update_withdrawal(
        &state,
        id,
        WithdrawalUpdateInput {
            status: body.status.to_ascii_uppercase(),
            notes: body.notes.clone(),
        },
    )
    .await?;

    Ok(Json(withdrawal))
}
