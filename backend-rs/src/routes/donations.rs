use std::cmp;

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::FromRow;
use tracing::instrument;
use uuid::Uuid;
use validator::Validate;

use crate::{auth::AuthUser, error::AppError, state::AppState};

const DEFAULT_PAGE_SIZE: i64 = 10;
const MAX_PAGE_SIZE: i64 = 100;

#[derive(Debug, Deserialize, Validate)]
struct CreateDonationRequest {
    #[serde(rename = "campaignId")]
    campaign_id: Uuid,
    #[validate(range(min = 0.01))]
    amount: f64,
    #[validate(length(max = 500))]
    message: Option<String>,
    #[serde(default)]
    anonymous: bool,
    #[serde(rename = "rewardId")]
    reward_id: Option<Uuid>,
    #[serde(rename = "paymentMethod")]
    payment_method: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CampaignDonationsQuery {
    page: Option<i64>,
    limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct RecentDonationsQuery {
    #[serde(rename = "creatorId")]
    creator_id: Uuid,
    limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct TopSupportersQuery {
    #[serde(rename = "creatorId")]
    creator_id: Uuid,
    limit: Option<i64>,
}

#[derive(Debug, FromRow)]
struct CampaignStatusRow {
    status: String,
}

#[derive(Debug, FromRow)]
struct RewardRow {
    id: Uuid,
    amount: f64,
    #[sqlx(rename = "limitedQuantity")]
    limited_quantity: Option<i32>,
    #[sqlx(rename = "claimedCount")]
    claimed_count: i32,
    #[sqlx(rename = "campaignId")]
    campaign_id: Uuid,
}

#[derive(Debug, FromRow)]
struct DonationRow {
    id: Uuid,
    amount: f64,
    message: Option<String>,
    anonymous: bool,
    status: String,
    #[sqlx(rename = "paymentMethod")]
    payment_method: Option<String>,
    #[sqlx(rename = "createdAt")]
    created_at: DateTime<Utc>,
    #[sqlx(rename = "donorId")]
    donor_id: Uuid,
    #[sqlx(rename = "donor_name")]
    donor_name: Option<String>,
    #[sqlx(rename = "donor_avatar")]
    donor_avatar: Option<String>,
    #[sqlx(rename = "campaignId")]
    campaign_id: Uuid,
    #[sqlx(rename = "campaign_title")]
    campaign_title: Option<String>,
    #[sqlx(rename = "campaign_slug")]
    campaign_slug: Option<String>,
    #[sqlx(rename = "rewardId")]
    reward_id: Option<Uuid>,
    #[sqlx(rename = "reward_title")]
    reward_title: Option<String>,
    #[sqlx(rename = "reward_amount")]
    reward_amount: Option<f64>,
    #[sqlx(rename = "reward_limited_quantity")]
    reward_limited_quantity: Option<i32>,
    #[sqlx(rename = "reward_claimed_count")]
    reward_claimed_count: Option<i32>,
}

#[derive(Debug, FromRow)]
struct TopSupporterRow {
    #[sqlx(rename = "donorId")]
    donor_id: Uuid,
    #[sqlx(rename = "total_amount")]
    total_amount: f64,
    #[sqlx(rename = "donor_name")]
    donor_name: Option<String>,
    #[sqlx(rename = "donor_avatar")]
    donor_avatar: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_donation))
        .route("/campaign/:campaign_id", get(list_campaign_donations))
        .route("/my", get(list_my_donations))
        .route("/recent", get(list_recent_donations))
        .route("/top-supporters", get(list_top_supporters))
        .route("/:id", get(get_donation_by_id))
}

#[instrument(skip(state, auth_user, payload))]
async fn create_donation(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateDonationRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let donor_id = parse_user_id(&auth_user)?;

    let campaign = sqlx::query_as::<_, CampaignStatusRow>(
        r#"
        SELECT status
        FROM "Campaign"
        WHERE id = $1
        "#,
    )
    .bind(payload.campaign_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if campaign.status != "ACTIVE" {
        return Err(AppError::BadRequest(
            "Campaign is not accepting donations".into(),
        ));
    }

    let reward = if let Some(reward_id) = payload.reward_id {
        let row = sqlx::query_as::<_, RewardRow>(
            r#"
        SELECT
            id,
            amount,
            "limitedQuantity",
            "claimedCount",
            "campaignId"
            FROM "Reward"
            WHERE id = $1
            "#,
        )
        .bind(reward_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

        if row.campaign_id != payload.campaign_id {
            return Err(AppError::BadRequest(
                "Reward does not belong to this campaign".into(),
            ));
        }

        if payload.amount < row.amount {
            return Err(AppError::BadRequest(format!(
                "Minimum donation for this reward is {}",
                row.amount
            )));
        }

        if let Some(limit) = row.limited_quantity {
            if row.claimed_count >= limit {
                return Err(AppError::BadRequest(
                    "This reward is no longer available".into(),
                ));
            }
        }

        Some(row)
    } else {
        None
    };

    let mut tx = state.pool.begin().await?;

    let donation_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO "Donation" (
            amount,
            message,
            anonymous,
            status,
            "paymentMethod",
            "donorId",
            "campaignId",
            "rewardId"
        ) VALUES (
            $1, $2, $3, 'COMPLETED', $4, $5, $6, $7
        )
        RETURNING id
        "#,
    )
    .bind(payload.amount)
    .bind(payload.message.as_ref())
    .bind(payload.anonymous)
    .bind(payload.payment_method.as_ref())
    .bind(donor_id)
    .bind(payload.campaign_id)
    .bind(payload.reward_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE "Campaign"
        SET "currentAmount" = "currentAmount" + $1
        WHERE id = $2
        "#,
    )
    .bind(payload.amount)
    .bind(payload.campaign_id)
    .execute(&mut *tx)
    .await?;

    if let Some(reward_row) = reward {
        let updated = sqlx::query_scalar::<_, i32>(
            r#"
            UPDATE "Reward"
            SET "claimedCount" = "claimedCount" + 1
            WHERE id = $1 AND (
                "limitedQuantity" IS NULL OR "claimedCount" < "limitedQuantity"
            )
            RETURNING "claimedCount"
            "#,
        )
        .bind(reward_row.id)
        .fetch_optional(&mut *tx)
        .await?;

        if updated.is_none() {
            return Err(AppError::BadRequest(
                "This reward is no longer available".into(),
            ));
        }
    }

    tx.commit().await?;

    let donation = fetch_donation_detail(&state, donation_id).await?;

    Ok(Json(json!({
        "success": true,
        "message": "Donation created successfully",
        "data": serialize_donation(donation, false, true)
    })))
}

#[instrument(skip(state, auth_user))]
async fn list_my_donations(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = parse_user_id(&auth_user)?;
    let donations = fetch_donations_by_donor(&state, user_id).await?;

    let data: Vec<_> = donations
        .into_iter()
        .map(|row| serialize_donation(row, true, false))
        .collect();

    Ok(Json(json!({ "success": true, "data": data })))
}

#[instrument(skip(state, auth_user))]
async fn get_donation_by_id(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = parse_user_id(&auth_user)?;
    let donation = fetch_donation_detail(&state, id).await?;

    if donation.donor_id != user_id && !auth_user.0.role.eq_ignore_ascii_case("ADMIN") {
        return Err(AppError::Forbidden);
    }

    Ok(Json(json!({
        "success": true,
        "data": serialize_donation(donation, true, false)
    })))
}

#[instrument(skip(state))]
async fn list_campaign_donations(
    State(state): State<AppState>,
    Path(campaign_id): Path<Uuid>,
    Query(params): Query<CampaignDonationsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = cmp::max(params.page.unwrap_or(1), 1);
    let limit = cmp::min(params.limit.unwrap_or(DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    let offset = (page - 1) * limit;

    let (rows, total) = fetch_donations_for_campaign(&state, campaign_id, limit, offset).await?;

    let donations: Vec<_> = rows
        .into_iter()
        .map(|row| serialize_donation(row, false, true))
        .collect();

    Ok(Json(json!({
        "success": true,
        "data": {
            "donations": donations,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": ((total as f64) / (limit as f64)).ceil() as i64,
            }
        }
    })))
}

#[instrument(skip(state))]
async fn list_recent_donations(
    State(state): State<AppState>,
    Query(params): Query<RecentDonationsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let limit = cmp::min(params.limit.unwrap_or(10), MAX_PAGE_SIZE);
    let rows = fetch_recent_donations(&state, params.creator_id, limit).await?;

    let donations: Vec<_> = rows
        .into_iter()
        .map(|row| serialize_donation(row, false, true))
        .collect();

    Ok(Json(json!({ "success": true, "data": donations })))
}

#[instrument(skip(state))]
async fn list_top_supporters(
    State(state): State<AppState>,
    Query(params): Query<TopSupportersQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let limit = cmp::min(params.limit.unwrap_or(10), MAX_PAGE_SIZE);

    let supporters = sqlx::query_as::<_, TopSupporterRow>(
        r#"
        SELECT
            d."donorId",
            SUM(d.amount)::double precision AS total_amount,
            u.name AS donor_name,
            u.avatar AS donor_avatar
        FROM "Donation" d
        JOIN "Campaign" c ON c.id = d."campaignId"
        LEFT JOIN "User" u ON u.id = d."donorId"
        WHERE c."creatorId" = $1
          AND d.status = 'COMPLETED'
          AND d.anonymous = false
        GROUP BY d."donorId", u.name, u.avatar
        ORDER BY total_amount DESC
        LIMIT $2
        "#,
    )
    .bind(params.creator_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let data: Vec<_> = supporters
        .into_iter()
        .enumerate()
        .map(|(idx, supporter)| {
            json!({
                "id": supporter.donor_id,
                "name": supporter.donor_name.unwrap_or_else(|| "Anonymous".to_string()),
                "avatar": supporter.donor_avatar,
                "totalAmount": supporter.total_amount,
                "rank": idx as i64 + 1,
            })
        })
        .collect();

    Ok(Json(json!({ "success": true, "data": data })))
}

fn parse_user_id(auth_user: &AuthUser) -> Result<Uuid, AppError> {
    Uuid::parse_str(&auth_user.0.user_id)
        .map_err(|_| AppError::Auth("Invalid token payload".into()))
}

fn serialize_donation(
    row: DonationRow,
    include_campaign: bool,
    sanitize_anonymous: bool,
) -> serde_json::Value {
    let donor = if sanitize_anonymous && row.anonymous {
        None
    } else {
        Some(json!({
            "id": row.donor_id,
            "name": row.donor_name,
            "avatar": row.donor_avatar,
        }))
    };

    let campaign = if include_campaign {
        Some(json!({
            "id": row.campaign_id,
            "title": row.campaign_title,
            "slug": row.campaign_slug,
        }))
    } else {
        None
    };

    let reward = row.reward_id.map(|reward_id| {
        json!({
            "id": reward_id,
            "title": row.reward_title,
            "amount": row.reward_amount,
            "limitedQuantity": row.reward_limited_quantity,
            "claimedCount": row.reward_claimed_count,
        })
    });

    json!({
        "id": row.id,
        "amount": row.amount,
        "message": row.message,
        "anonymous": row.anonymous,
        "status": row.status,
        "paymentMethod": row.payment_method,
        "createdAt": row.created_at,
        "donor": donor,
        "campaign": campaign,
        "reward": reward,
    })
}

async fn fetch_donation_detail(state: &AppState, id: Uuid) -> Result<DonationRow, AppError> {
    sqlx::query_as::<_, DonationRow>(
        r#"
        SELECT
            d.id,
            d.amount,
            d.message,
            d.anonymous,
            d.status,
            d."paymentMethod",
            d."createdAt",
            d."donorId",
            u.name AS donor_name,
            u.avatar AS donor_avatar,
            d."campaignId",
            c.title AS campaign_title,
            c.slug AS campaign_slug,
            d."rewardId",
            r.title AS reward_title,
            r.amount AS reward_amount,
            r."limitedQuantity" AS reward_limited_quantity,
            r."claimedCount" AS reward_claimed_count
        FROM "Donation" d
        LEFT JOIN "User" u ON u.id = d."donorId"
        LEFT JOIN "Campaign" c ON c.id = d."campaignId"
        LEFT JOIN "Reward" r ON r.id = d."rewardId"
        WHERE d.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)
}

async fn fetch_donations_by_donor(
    state: &AppState,
    donor_id: Uuid,
) -> Result<Vec<DonationRow>, AppError> {
    let rows = sqlx::query_as::<_, DonationRow>(
        r#"
        SELECT
            d.id,
            d.amount,
            d.message,
            d.anonymous,
            d.status,
            d."paymentMethod",
            d."createdAt",
            d."donorId",
            u.name AS donor_name,
            u.avatar AS donor_avatar,
            d."campaignId",
            c.title AS campaign_title,
            c.slug AS campaign_slug,
            d."rewardId",
            r.title AS reward_title,
            r.amount AS reward_amount,
            r."limitedQuantity" AS reward_limited_quantity,
            r."claimedCount" AS reward_claimed_count
        FROM "Donation" d
        LEFT JOIN "User" u ON u.id = d."donorId"
        LEFT JOIN "Campaign" c ON c.id = d."campaignId"
        LEFT JOIN "Reward" r ON r.id = d."rewardId"
        WHERE d."donorId" = $1
        ORDER BY d."createdAt" DESC
        "#,
    )
    .bind(donor_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(rows)
}

async fn fetch_donations_for_campaign(
    state: &AppState,
    campaign_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<DonationRow>, i64), AppError> {
    let rows = sqlx::query_as::<_, DonationRow>(
        r#"
        SELECT
            d.id,
            d.amount,
            d.message,
            d.anonymous,
            d.status,
            d."paymentMethod",
            d."createdAt",
            d."donorId",
            u.name AS donor_name,
            u.avatar AS donor_avatar,
            d."campaignId",
            c.title AS campaign_title,
            c.slug AS campaign_slug,
            d."rewardId",
            r.title AS reward_title,
            r.amount AS reward_amount,
            r."limitedQuantity" AS reward_limited_quantity,
            r."claimedCount" AS reward_claimed_count
        FROM "Donation" d
        LEFT JOIN "User" u ON u.id = d."donorId"
        LEFT JOIN "Reward" r ON r.id = d."rewardId"
        WHERE d."campaignId" = $1
          AND d.status = 'COMPLETED'
        ORDER BY d."createdAt" DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(campaign_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM "Donation"
        WHERE "campaignId" = $1
          AND status = 'COMPLETED'
        "#,
    )
    .bind(campaign_id)
    .fetch_one(&state.pool)
    .await?;

    Ok((rows, total))
}

async fn fetch_recent_donations(
    state: &AppState,
    creator_id: Uuid,
    limit: i64,
) -> Result<Vec<DonationRow>, AppError> {
    let rows = sqlx::query_as::<_, DonationRow>(
        r#"
        SELECT
            d.id,
            d.amount,
            d.message,
            d.anonymous,
            d.status,
            d."paymentMethod",
            d."createdAt",
            d."donorId",
            u.name AS donor_name,
            u.avatar AS donor_avatar,
            d."campaignId",
            NULL::text AS campaign_title,
            NULL::text AS campaign_slug,
            d."rewardId",
            r.title AS reward_title,
            r.amount AS reward_amount,
            r."limitedQuantity" AS reward_limited_quantity,
            r."claimedCount" AS reward_claimed_count
        FROM "Donation" d
        JOIN "Campaign" c ON c.id = d."campaignId"
        LEFT JOIN "User" u ON u.id = d."donorId"
        LEFT JOIN "Reward" r ON r.id = d."rewardId"
        WHERE c."creatorId" = $1
          AND d.status = 'COMPLETED'
        ORDER BY d."createdAt" DESC
        LIMIT $2
        "#,
    )
    .bind(creator_id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    Ok(rows)
}
