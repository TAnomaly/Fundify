use crate::error::AppError;
use crate::models::campaign::{
    CampaignDetail, CampaignDetailRow, CampaignSummary, CampaignSummaryRow,
};
use crate::state::AppState;
use crate::utils::slug::slugify;
use chrono::{DateTime, Utc};
use sqlx::postgres::PgQueryResult;
use sqlx::{Postgres, QueryBuilder, Row};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct CampaignListFilters {
    pub status: Option<String>,
    pub category: Option<String>,
    pub search: Option<String>,
    pub campaign_type: Option<String>,
    pub creator_id: Option<Uuid>,
    pub page: u32,
    pub limit: u32,
    pub enforce_active_default: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
    pub total: i64,
    pub pages: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CampaignListResponse {
    pub campaigns: Vec<CampaignSummary>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone)]
pub struct CampaignInput {
    pub title: String,
    pub description: String,
    pub story: String,
    pub campaign_type: String,
    pub category: String,
    pub goal_amount: f64,
    pub currency: String,
    pub cover_image: String,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct CampaignUpdateInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub story: Option<String>,
    pub campaign_type: Option<String>,
    pub category: Option<String>,
    pub goal_amount: Option<f64>,
    pub currency: Option<String>,
    pub cover_image: Option<String>,
    pub images: Option<Vec<String>>,
    pub video_url: Option<Option<String>>,
    pub start_date: Option<Option<DateTime<Utc>>>,
    pub end_date: Option<Option<DateTime<Utc>>>,
    pub status: Option<String>,
}

pub async fn list_campaigns(
    state: &AppState,
    filters: CampaignListFilters,
) -> Result<CampaignListResponse, AppError> {
    let page = filters.page.max(1);
    let limit = filters.limit.clamp(1, 100);
    let offset = ((page - 1) as i64) * (limit as i64);

    let status_filter = if filters.status.is_some() {
        filters.status.clone()
    } else if filters.enforce_active_default {
        Some(String::from("ACTIVE"))
    } else {
        None
    };

    let mut list_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            c.id,
            c.slug,
            c.title,
            c.description,
            c.goal_amount::double precision AS goal_amount,
            c.current_amount::double precision AS current_amount,
            c.currency,
            c.status::text AS status,
            c.campaign_type::text AS campaign_type,
            c.cover_image,
            c.start_date,
            c.end_date,
            c.created_at,
            c.updated_at,
            COALESCE(d.donation_total, 0) AS donation_total,
            COALESCE(d.donation_count, 0) AS donation_count,
            u.id AS creator_id,
            u.name AS creator_name,
            u.username AS creator_username,
            u.avatar AS creator_avatar,
            u.creator_bio AS creator_creator_bio,
            u.is_creator AS creator_is_creator
        FROM campaigns c
        JOIN users u ON u.id = c.creator_id
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::bigint AS donation_count,
                COALESCE(SUM(amount), 0)::double precision AS donation_total
            FROM donations d
            WHERE d.campaign_id = c.id AND d.status = 'COMPLETED'
        ) d ON TRUE
        "#,
    );

    apply_campaign_filters(&mut list_builder, &filters, status_filter.clone());
    list_builder.push(" ORDER BY c.created_at DESC ");
    list_builder
        .push(" LIMIT ")
        .push_bind(limit as i64)
        .push(" OFFSET ")
        .push_bind(offset);

    let campaigns_rows = list_builder
        .build_query_as::<CampaignSummaryRow>()
        .fetch_all(&state.db_pool)
        .await?;

    let campaigns = campaigns_rows
        .into_iter()
        .map(CampaignSummary::from)
        .collect();

    let mut count_builder =
        QueryBuilder::<Postgres>::new("SELECT COUNT(*)::bigint AS total FROM campaigns c");
    apply_campaign_filters(&mut count_builder, &filters, status_filter);

    let total: i64 = count_builder
        .build()
        .fetch_one(&state.db_pool)
        .await?
        .get::<i64, _>("total");

    let pages = if total == 0 {
        0
    } else {
        ((total + (limit as i64) - 1) / (limit as i64)) as u32
    };

    Ok(CampaignListResponse {
        campaigns,
        pagination: Pagination {
            page,
            limit,
            total,
            pages,
        },
    })
}

pub async fn get_campaign_by_slug(
    state: &AppState,
    slug: &str,
) -> Result<CampaignDetail, AppError> {
    let row = sqlx::query_as::<_, CampaignDetailRow>(
        r#"
        SELECT
            c.id,
            c.slug,
            c.title,
            c.description,
            c.story,
            c.goal_amount::double precision AS goal_amount,
            c.current_amount::double precision AS current_amount,
            c.currency,
            c.status::text AS status,
            c.campaign_type::text AS campaign_type,
            c.category::text AS category,
            c.cover_image,
            COALESCE(c.images, '{}') AS images,
            c.video_url,
            c.start_date,
            c.end_date,
            c.created_at,
            c.updated_at,
            COALESCE(d.donation_total, 0) AS donation_total,
            COALESCE(d.donation_count, 0) AS donation_count,
            u.id AS creator_id,
            u.name AS creator_name,
            u.username AS creator_username,
            u.avatar AS creator_avatar,
            u.creator_bio AS creator_creator_bio,
            u.is_creator AS creator_is_creator
        FROM campaigns c
        JOIN users u ON u.id = c.creator_id
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::bigint AS donation_count,
                COALESCE(SUM(amount), 0)::double precision AS donation_total
            FROM donations d
            WHERE d.campaign_id = c.id AND d.status = 'COMPLETED'
        ) d ON TRUE
        WHERE c.slug = $1
        LIMIT 1
        "#,
    )
    .bind(slug)
    .fetch_optional(&state.db_pool)
    .await?;

    row.map(CampaignDetail::from).ok_or(AppError::NotFound("Campaign not found".to_string()))
}

pub async fn create_campaign(
    state: &AppState,
    user_id: Uuid,
    input: CampaignInput,
) -> Result<CampaignDetail, AppError> {
    let mut slug_base = slugify(&input.title);
    if slug_base.is_empty() {
        slug_base = Uuid::new_v4().to_string();
    }

    let slug = generate_unique_slug(&state.db_pool, &slug_base).await?;

    sqlx::query(
        r#"
        INSERT INTO campaigns (
            id,
            slug,
            title,
            description,
            story,
            campaign_type,
            category,
            goal_amount,
            current_amount,
            currency,
            status,
            cover_image,
            images,
            video_url,
            start_date,
            end_date,
            creator_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6::campaign_type, $7::campaign_category,
            $8, 0, $9, 'ACTIVE', $10, $11, $12, $13, $14, $15
        )
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(&slug)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.story)
    .bind(&input.campaign_type)
    .bind(&input.category)
    .bind(input.goal_amount)
    .bind(&input.currency)
    .bind(&input.cover_image)
    .bind(&input.images)
    .bind(&input.video_url)
    .bind(&input.start_date)
    .bind(&input.end_date)
    .bind(user_id)
    .execute(&state.db_pool)
    .await?;

    get_campaign_by_slug(state, &slug).await
}

pub async fn update_campaign(
    state: &AppState,
    user_id: Uuid,
    campaign_id: Uuid,
    input: CampaignUpdateInput,
) -> Result<CampaignDetail, AppError> {
    let mut builder = QueryBuilder::<Postgres>::new("UPDATE campaigns SET ");
    let mut changes = builder.separated(", ");
    let mut has_changes = false;

    if let Some(title) = &input.title {
        changes.push("title = ").push_bind(title.as_str());
        has_changes = true;
    }
    if let Some(description) = &input.description {
        changes
            .push("description = ")
            .push_bind(description.as_str());
        has_changes = true;
    }
    if let Some(story) = &input.story {
        changes.push("story = ").push_bind(story.as_str());
        has_changes = true;
    }
    if let Some(campaign_type) = &input.campaign_type {
        changes
            .push("campaign_type = ")
            .push_bind(campaign_type.as_str())
            .push("::campaign_type");
        has_changes = true;
    }
    if let Some(category) = &input.category {
        changes
            .push("category = ")
            .push_bind(category.as_str())
            .push("::campaign_category");
        has_changes = true;
    }
    if let Some(goal_amount) = input.goal_amount {
        changes.push("goal_amount = ").push_bind(goal_amount);
        has_changes = true;
    }
    if let Some(currency) = &input.currency {
        changes.push("currency = ").push_bind(currency.as_str());
        has_changes = true;
    }
    if let Some(cover_image) = &input.cover_image {
        changes
            .push("cover_image = ")
            .push_bind(cover_image.as_str());
        has_changes = true;
    }
    if let Some(images) = &input.images {
        changes.push("images = ").push_bind(images.as_slice());
        has_changes = true;
    }
    if let Some(video_url) = input.video_url {
        changes.push("video_url = ").push_bind(video_url);
        has_changes = true;
    }
    if let Some(start_date) = input.start_date {
        changes.push("start_date = ").push_bind(start_date);
        has_changes = true;
    }
    if let Some(end_date) = input.end_date {
        changes.push("end_date = ").push_bind(end_date);
        has_changes = true;
    }
    if let Some(status) = &input.status {
        changes
            .push("status = ")
            .push_bind(status.as_str())
            .push("::campaign_status");
        has_changes = true;
    }

    if !has_changes {
        return Err(AppError::Validation(vec![String::from(
            "No fields provided for update",
        )]));
    }

    builder.push(", updated_at = NOW()");
    builder.push(" WHERE id = ").push_bind(campaign_id);
    builder.push(" AND creator_id = ").push_bind(user_id);
    builder.push(" RETURNING slug");

    let slug_row = builder.build().fetch_optional(&state.db_pool).await?;

    let slug: String = slug_row
        .map(|row| row.get::<String, _>("slug"))
        .ok_or(AppError::NotFound("Campaign not found".to_string()))?;

    get_campaign_by_slug(state, &slug).await
}

pub async fn delete_campaign(
    state: &AppState,
    user_id: Uuid,
    campaign_id: Uuid,
) -> Result<(), AppError> {
    let result: PgQueryResult =
        sqlx::query("DELETE FROM campaigns WHERE id = $1 AND creator_id = $2")
            .bind(campaign_id)
            .bind(user_id)
            .execute(&state.db_pool)
            .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    }

    Ok(())
}

async fn generate_unique_slug(pool: &sqlx::PgPool, base: &str) -> Result<String, AppError> {
    let mut candidate = base.to_string();
    let mut counter = 1;

    loop {
        let exists =
            sqlx::query_scalar::<_, Uuid>("SELECT id FROM campaigns WHERE slug = $1 LIMIT 1")
                .bind(&candidate)
                .fetch_optional(pool)
                .await?
                .is_some();

        if !exists {
            return Ok(candidate);
        }

        candidate = format!("{}-{}", base, counter);
        counter += 1;
    }
}

fn apply_campaign_filters(
    builder: &mut QueryBuilder<Postgres>,
    filters: &CampaignListFilters,
    status_filter: Option<String>,
) {
    let mut has_where = false;

    if let Some(status) = status_filter {
        push_where_clause(builder, &mut has_where);
        builder
            .push("c.status = ")
            .push_bind(status)
            .push("::campaign_status");
    }

    if let Some(category) = filters.category.clone() {
        push_where_clause(builder, &mut has_where);
        builder
            .push("c.category = ")
            .push_bind(category)
            .push("::campaign_category");
    }

    if let Some(campaign_type) = filters.campaign_type.clone() {
        push_where_clause(builder, &mut has_where);
        builder
            .push("c.campaign_type = ")
            .push_bind(campaign_type)
            .push("::campaign_type");
    }

    if let Some(creator_id) = filters.creator_id {
        push_where_clause(builder, &mut has_where);
        builder.push("c.creator_id = ").push_bind(creator_id);
    }

    if let Some(search) = filters.search.clone() {
        let pattern = format!("%{}%", search);
        push_where_clause(builder, &mut has_where);
        builder
            .push("(c.title ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR c.description ILIKE ")
            .push_bind(pattern)
            .push(")");
    }
}

fn push_where_clause(builder: &mut QueryBuilder<Postgres>, has_where: &mut bool) {
    if *has_where {
        builder.push(" AND ");
    } else {
        builder.push(" WHERE ");
        *has_where = true;
    }
}
