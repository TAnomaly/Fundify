use crate::error::AppError;
use crate::models::donation::{Donation, DonationRow};
use crate::state::AppState;
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct DonationInput {
    pub campaign_id: Uuid,
    pub amount: f64,
    pub message: Option<String>,
    pub anonymous: bool,
    pub payment_method: Option<String>,
    pub transaction_id: Option<String>,
}

pub async fn create_donation(
    state: &AppState,
    donor_id: Uuid,
    input: DonationInput,
) -> Result<Donation, AppError> {
    if input.amount <= 0.0 {
        return Err(AppError::Validation(vec![
            "Amount must be greater than zero".to_string(),
        ]));
    }

    let mut tx = state.db_pool.begin().await?;

    // Ensure campaign exists and is active
    let campaign = sqlx::query("SELECT id, status::text AS status FROM campaigns WHERE id = $1")
        .bind(input.campaign_id)
        .fetch_optional(&mut *tx)
        .await?;

    let campaign_row = campaign.ok_or(AppError::NotFound("Campaign not found".to_string()))?;
    let status: String = campaign_row.try_get("status")?;

    if status == "CANCELLED" || status == "PAUSED" {
        return Err(AppError::Validation(vec![
            "Campaign is not accepting donations".to_string(),
        ]));
    }

    let donation_id = Uuid::new_v4();

    let donation = sqlx::query_as::<_, DonationRow>(
        r#"
        INSERT INTO donations (
            id,
            campaign_id,
            donor_id,
            amount,
            message,
            anonymous,
            status,
            payment_method,
            transaction_id
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'COMPLETED',
            $7,
            $8
        )
        RETURNING
            id,
            campaign_id,
            donor_id,
            amount::double precision AS amount,
            message,
            anonymous,
            status::text AS status,
            payment_method,
            transaction_id,
            created_at,
            updated_at
        "#,
    )
    .bind(donation_id)
    .bind(input.campaign_id)
    .bind(donor_id)
    .bind(input.amount)
    .bind(input.message)
    .bind(input.anonymous)
    .bind(input.payment_method)
    .bind(input.transaction_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE campaigns
        SET current_amount = current_amount + $1,
            updated_at = NOW()
        WHERE id = $2
        "#,
    )
    .bind(input.amount)
    .bind(input.campaign_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Donation::from(donation))
}
