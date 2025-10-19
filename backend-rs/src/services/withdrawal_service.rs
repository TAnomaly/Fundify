use crate::error::AppError;
use crate::models::membership::Withdrawal;
use crate::state::AppState;
use sqlx::{QueryBuilder, Row};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct WithdrawalCreateInput {
    pub campaign_id: Uuid,
    pub amount_cents: i64,
    pub bank_account: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone)]
pub struct WithdrawalUpdateInput {
    pub status: String,
    pub notes: Option<String>,
}

pub async fn create_withdrawal(
    state: &AppState,
    user_id: Uuid,
    input: WithdrawalCreateInput,
) -> Result<Withdrawal, AppError> {
    // ensure campaign belongs to user and has funds
    let campaign = sqlx::query(
        "SELECT creator_id, current_amount FROM campaigns WHERE id = $1",
    )
    .bind(input.campaign_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(campaign) = campaign else {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    };

    let creator_id: Uuid = campaign.get("creator_id");
    if creator_id != user_id {
        return Err(AppError::Unauthorized);
    }

    let current_amount: f64 = campaign.get("current_amount");
    let available_cents = (current_amount * 100.0).round() as i64;
    if input.amount_cents > available_cents {
        return Err(AppError::Validation(vec![
            "Insufficient funds in campaign".to_string()
        ]));
    }

    let pending = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::bigint FROM withdrawals WHERE campaign_id = $1 AND status = 'PENDING'",
    )
    .bind(input.campaign_id)
    .fetch_one(&state.db_pool)
    .await?;

    if pending > 0 {
        return Err(AppError::Validation(vec![
            "There is already a pending withdrawal for this campaign".to_string(),
        ]));
    }

    let withdrawal = sqlx::query_as::<_, Withdrawal>(
        r#"
        INSERT INTO withdrawals (
            id,
            user_id,
            campaign_id,
            amount_cents,
            status,
            notes,
            bank_account
        ) VALUES (
            $1, $2, $3, $4, 'PENDING'::withdrawal_status, $5, $6
        )
        RETURNING id, user_id, campaign_id, amount_cents, status::text AS status, requested_at,
                  processed_at, notes, bank_account, created_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(input.campaign_id)
    .bind(input.amount_cents)
    .bind(&input.notes)
    .bind(&input.bank_account)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(withdrawal)
}

pub async fn list_user_withdrawals(
    state: &AppState,
    user_id: Uuid,
    status: Option<String>,
) -> Result<Vec<Withdrawal>, AppError> {
    let mut query = QueryBuilder::new(
        "SELECT id, user_id, campaign_id, amount_cents, status::text AS status, requested_at, processed_at, notes, bank_account, created_at FROM withdrawals WHERE user_id = ",
    );
    query.push_bind(user_id);

    if let Some(status) = status.as_ref() {
        query
            .push(" AND status = ")
            .push_bind(status.to_ascii_uppercase())
            .push("::withdrawal_status");
    }

    query.push(" ORDER BY requested_at DESC");

    Ok(query
        .build_query_as::<Withdrawal>()
        .fetch_all(&state.db_pool)
        .await?)
}

pub async fn list_all_withdrawals(
    state: &AppState,
    status: Option<String>,
) -> Result<Vec<Withdrawal>, AppError> {
    let mut query = QueryBuilder::new(
        "SELECT id, user_id, campaign_id, amount_cents, status::text AS status, requested_at, processed_at, notes, bank_account, created_at FROM withdrawals WHERE 1 = 1",
    );

    if let Some(status) = status.as_ref() {
        query
            .push(" AND status = ")
            .push_bind(status.to_ascii_uppercase())
            .push("::withdrawal_status");
    }

    query.push(" ORDER BY requested_at DESC");

    Ok(query
        .build_query_as::<Withdrawal>()
        .fetch_all(&state.db_pool)
        .await?)
}

pub async fn update_withdrawal(
    state: &AppState,
    withdrawal_id: Uuid,
    input: WithdrawalUpdateInput,
) -> Result<Withdrawal, AppError> {
    let existing = sqlx::query(
        "SELECT campaign_id, amount_cents, status::text AS status FROM withdrawals WHERE id = $1",
    )
    .bind(withdrawal_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(existing) = existing else {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    };

    let campaign_id: Uuid = existing.get("campaign_id");
    let amount_cents: i64 = existing.get("amount_cents");
    let current_status: Option<String> = existing.get("status");

    let new_status = input.status.to_ascii_uppercase();
    if !matches!(
        new_status.as_str(),
        "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
    ) {
        return Err(AppError::Validation(vec![
            "Invalid withdrawal status".to_string()
        ]));
    }

    if new_status == "COMPLETED" && current_status.as_deref() != Some("COMPLETED") {
        sqlx::query(
            "UPDATE campaigns SET current_amount = current_amount - $1::numeric / 100.0 WHERE id = $2",
        )
        .bind(amount_cents)
        .bind(campaign_id)
        .execute(&state.db_pool)
        .await?;
    }

    sqlx::query(
        "UPDATE withdrawals SET status = $1::withdrawal_status, notes = $2, processed_at = CASE WHEN $1 = 'PENDING' THEN NULL ELSE NOW() END WHERE id = $3",
    )
    .bind(&new_status)
    .bind(&input.notes)
    .bind(withdrawal_id)
    .execute(&state.db_pool)
    .await?;

    let withdrawal = sqlx::query_as::<_, Withdrawal>(
        r#"
        SELECT id, user_id, campaign_id, amount_cents, status::text AS status, requested_at, processed_at, notes, bank_account, created_at
        FROM withdrawals
        WHERE id = $1
        "#,
    )
    .bind(withdrawal_id)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(withdrawal)
}
