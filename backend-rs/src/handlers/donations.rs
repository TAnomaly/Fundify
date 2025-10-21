use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Extension;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::middleware::auth::AuthUser;
use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(Deserialize)]
pub struct CreateDonationRequest {
    #[serde(rename = "campaignId")]
    pub campaign_id: String,
    pub amount: f64,
    pub message: Option<String>,
    pub anonymous: Option<bool>,
    #[serde(rename = "paymentMethod")]
    pub payment_method: Option<String>,
    #[serde(rename = "rewardId")]
    pub reward_id: Option<String>,
}

#[derive(Serialize)]
pub struct DonationResponse {
    pub id: String,
    pub amount: f64,
    pub message: Option<String>,
    pub anonymous: bool,
    #[serde(rename = "paymentMethod")]
    pub payment_method: String,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub donor: Option<DonorInfo>,
    pub campaign: CampaignInfo,
}

#[derive(Serialize)]
pub struct DonorInfo {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Serialize)]
pub struct CampaignInfo {
    pub id: String,
    pub title: String,
    pub slug: String,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
}

#[derive(Deserialize)]
pub struct ListDonationsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
}

#[derive(Serialize)]
pub struct DonationsListResponse {
    pub donations: Vec<DonationResponse>,
    pub pagination: PaginationInfo,
}

#[derive(Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

pub async fn create_donation(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    axum::Json(req): axum::Json<CreateDonationRequest>,
) -> AppResult<impl IntoResponse> {
    if req.amount <= 0.0 {
        return Err(AppError::BadRequest(
            "Donation amount must be positive".to_string(),
        ));
    }

    // Check campaign exists and is active
    let campaign: Option<(String,)> =
        sqlx::query_as(r#"SELECT status FROM "Campaign" WHERE id = $1 AND status = 'ACTIVE'"#)
            .bind(&req.campaign_id)
            .fetch_optional(&state.db)
            .await?;

    if campaign.is_none() {
        return Err(AppError::BadRequest(
            "Campaign not found or not accepting donations".to_string(),
        ));
    }

    let donation_id = Uuid::new_v4().to_string();
    let anonymous = req.anonymous.unwrap_or(false);
    let payment_method = req.payment_method.unwrap_or_else(|| "CARD".to_string());

    // Begin transaction
    let mut tx = state.db.begin().await?;

    // Create donation
    sqlx::query(
        r#"INSERT INTO "Donation"
        (id, amount, message, anonymous, "paymentMethod", status, "donorId", "campaignId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())"#
    )
    .bind(&donation_id)
    .bind(req.amount)
    .bind(&req.message)
    .bind(anonymous)
    .bind(&payment_method)
    .bind("COMPLETED")
    .bind(auth_user.id.to_string())
    .bind(&req.campaign_id)
    .execute(&mut *tx)
    .await?;

    // Update campaign amount
    sqlx::query(r#"UPDATE "Campaign" SET "currentAmount" = "currentAmount" + $1 WHERE id = $2"#)
        .bind(req.amount)
        .bind(&req.campaign_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    // Fetch created donation
    let row = sqlx::query(
        r#"SELECT d.id, d.amount, d.message, d.anonymous, d."paymentMethod", d.status, d."createdAt",
           u.id as donor_id, u.name as donor_name, u.avatar as donor_avatar,
           c.id as campaign_id, c.title as campaign_title, c.slug as campaign_slug, c."coverImage" as campaign_cover
        FROM "Donation" d
        LEFT JOIN "User" u ON d."donorId" = u.id
        LEFT JOIN "Campaign" c ON d."campaignId" = c.id
        WHERE d.id = $1"#
    )
    .bind(&donation_id)
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    let is_anonymous = row.get::<bool, _>("anonymous");
    let response = DonationResponse {
        id: row.get("id"),
        amount: row.get("amount"),
        message: row.get("message"),
        anonymous: is_anonymous,
        payment_method: row.get("paymentMethod"),
        status: row.get("status"),
        created_at: row
            .get::<chrono::NaiveDateTime, _>("createdAt")
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
        donor: if !is_anonymous {
            Some(DonorInfo {
                id: row.get("donor_id"),
                name: row.get("donor_name"),
                avatar: row.get("donor_avatar"),
            })
        } else {
            None
        },
        campaign: CampaignInfo {
            id: row.get("campaign_id"),
            title: row.get("campaign_title"),
            slug: row.get("campaign_slug"),
            cover_image: row.get("campaign_cover"),
        },
    };

    Ok((StatusCode::CREATED, ApiResponse::success(response)))
}

pub async fn list_donations(
    State(state): State<AppState>,
    Path(campaign_id): Path<Uuid>,
    Query(params): Query<ListDonationsQuery>,
) -> AppResult<impl IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(10).min(100);
    let skip = (page - 1) * limit;

    let rows = sqlx::query(
        r#"SELECT d.id, d.amount, d.message, d.anonymous, d."paymentMethod", d.status, d."createdAt",
           u.id as donor_id, u.name as donor_name, u.avatar as donor_avatar,
           c.id as campaign_id, c.title as campaign_title, c.slug as campaign_slug, c."coverImage" as campaign_cover
        FROM "Donation" d
        LEFT JOIN "User" u ON d."donorId" = u.id
        LEFT JOIN "Campaign" c ON d."campaignId" = c.id
        WHERE d."campaignId" = $1 AND d.status = 'COMPLETED'
        ORDER BY d."createdAt" DESC
        LIMIT $2 OFFSET $3"#
    )
    .bind(campaign_id.to_string())
    .bind(limit)
    .bind(skip)
    .fetch_all(&state.db)
    .await?;

    let (total,): (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM "Donation" WHERE "campaignId" = $1 AND status = 'COMPLETED'"#,
    )
    .bind(campaign_id.to_string())
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    let mut donations = Vec::new();
    for row in rows {
        let is_anonymous = row.get::<bool, _>("anonymous");
        donations.push(DonationResponse {
            id: row.get("id"),
            amount: row.get("amount"),
            message: row.get("message"),
            anonymous: is_anonymous,
            payment_method: row.get("paymentMethod"),
            status: row.get("status"),
            created_at: row
                .get::<chrono::NaiveDateTime, _>("createdAt")
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
            donor: if !is_anonymous {
                Some(DonorInfo {
                    id: row.get("donor_id"),
                    name: row.get("donor_name"),
                    avatar: row.get("donor_avatar"),
                })
            } else {
                None
            },
            campaign: CampaignInfo {
                id: row.get("campaign_id"),
                title: row.get("campaign_title"),
                slug: row.get("campaign_slug"),
                cover_image: row.get("campaign_cover"),
            },
        });
    }

    let pages = ((total as f64) / (limit as f64)).ceil() as i32;

    Ok(ApiResponse::success(DonationsListResponse {
        donations,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages,
        },
    }))
}

pub async fn get_my_donations(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> AppResult<impl IntoResponse> {
    let rows = sqlx::query(
        r#"SELECT d.id, d.amount, d.message, d.anonymous, d."paymentMethod", d.status, d."createdAt",
           u.id as donor_id, u.name as donor_name, u.avatar as donor_avatar,
           c.id as campaign_id, c.title as campaign_title, c.slug as campaign_slug, c."coverImage" as campaign_cover
        FROM "Donation" d
        LEFT JOIN "User" u ON d."donorId" = u.id
        LEFT JOIN "Campaign" c ON d."campaignId" = c.id
        WHERE d."donorId" = $1
        ORDER BY d."createdAt" DESC"#
    )
    .bind(auth_user.id.to_string())
    .fetch_all(&state.db)
    .await?;

    use sqlx::Row;
    let mut donations = Vec::new();
    for row in rows {
        let is_anonymous = row.get::<bool, _>("anonymous");
        donations.push(DonationResponse {
            id: row.get("id"),
            amount: row.get("amount"),
            message: row.get("message"),
            anonymous: is_anonymous,
            payment_method: row.get("paymentMethod"),
            status: row.get("status"),
            created_at: row
                .get::<chrono::NaiveDateTime, _>("createdAt")
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string(),
            donor: if !is_anonymous {
                Some(DonorInfo {
                    id: row.get("donor_id"),
                    name: row.get("donor_name"),
                    avatar: row.get("donor_avatar"),
                })
            } else {
                None
            },
            campaign: CampaignInfo {
                id: row.get("campaign_id"),
                title: row.get("campaign_title"),
                slug: row.get("campaign_slug"),
                cover_image: row.get("campaign_cover"),
            },
        });
    }

    Ok(ApiResponse::success(donations))
}
