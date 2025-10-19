use crate::error::AppError;
use crate::models::membership::{MembershipTier, MembershipTierSummary};
use crate::state::AppState;
use serde_json::Value;
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct MembershipTierInput {
    pub campaign_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub price_cents: i32,
    pub interval: String,
    pub perks: Vec<String>,
    pub has_exclusive_content: bool,
    pub has_early_access: bool,
    pub has_priority_support: bool,
    pub custom_perks: Option<Value>,
    pub max_subscribers: Option<i32>,
    pub position: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct MembershipTierUpdateInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub price_cents: Option<i32>,
    pub interval: Option<String>,
    pub perks: Option<Vec<String>>,
    pub has_exclusive_content: Option<bool>,
    pub has_early_access: Option<bool>,
    pub has_priority_support: Option<bool>,
    pub custom_perks: Option<Option<Value>>,
    pub max_subscribers: Option<Option<i32>>,
    pub position: Option<i32>,
    pub is_active: Option<bool>,
}

pub async fn create_membership_tier(
    state: &AppState,
    user_id: Uuid,
    input: MembershipTierInput,
) -> Result<MembershipTier, AppError> {
    let campaign = sqlx::query(
        "SELECT creator_id, type::text AS campaign_type FROM campaigns WHERE id = $1",
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

    let campaign_type: Option<String> = campaign.get("campaign_type");
    if let Some(campaign_type) = campaign_type {
        if campaign_type.eq_ignore_ascii_case("PROJECT") {
            return Err(AppError::Validation(vec![
                "Membership tiers are only available for CREATOR campaigns".to_string(),
            ]));
        }
    }

    let tier = sqlx::query_as::<_, MembershipTier>(
        r#"
        INSERT INTO membership_tiers (
            id,
            campaign_id,
            name,
            description,
            price_cents,
            interval,
            perks,
            has_exclusive_content,
            has_early_access,
            has_priority_support,
            custom_perks,
            max_subscribers,
            current_subscribers,
            position,
            is_active
        ) VALUES (
            $1, $2, $3, $4, $5, $6::subscription_interval, $7, $8, $9, $10, $11, $12, 0, $13, TRUE
        )
        RETURNING id, campaign_id, name, description, price_cents, interval::text AS interval, perks,
                  has_exclusive_content, has_early_access, has_priority_support, custom_perks,
                  max_subscribers, current_subscribers, position, is_active, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(input.campaign_id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.price_cents)
    .bind(&input.interval)
    .bind(&input.perks)
    .bind(input.has_exclusive_content)
    .bind(input.has_early_access)
    .bind(input.has_priority_support)
    .bind(&input.custom_perks)
    .bind(input.max_subscribers)
    .bind(input.position.unwrap_or(0))
    .fetch_one(&state.db_pool)
    .await?;

    Ok(tier)
}

pub async fn list_membership_tiers(
    state: &AppState,
    campaign_id: Uuid,
) -> Result<Vec<MembershipTierSummary>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT
            mt.id,
            mt.campaign_id,
            mt.name,
            mt.description,
            mt.price_cents,
            mt.interval::text AS interval,
            mt.perks,
            mt.has_exclusive_content,
            mt.has_early_access,
            mt.has_priority_support,
            mt.custom_perks,
            mt.max_subscribers,
            mt.current_subscribers,
            mt.position,
            mt.is_active,
            mt.created_at,
            mt.updated_at,
            COALESCE(s.active_count, 0) AS active_subscribers
        FROM membership_tiers mt
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS active_count
            FROM subscriptions s
            WHERE s.tier_id = mt.id AND s.status = 'ACTIVE'
        ) s ON TRUE
        WHERE mt.campaign_id = $1 AND mt.is_active = TRUE
        ORDER BY mt.position ASC, mt.created_at ASC
        "#,
    )
    .bind(campaign_id)
    .map(|row: sqlx::postgres::PgRow| {
        let tier = MembershipTier {
            id: row.get("id"),
            campaign_id: row.get("campaign_id"),
            name: row.get("name"),
            description: row.get("description"),
            price_cents: row.get("price_cents"),
            interval: row.get("interval"),
            perks: row.get("perks"),
            has_exclusive_content: row.get("has_exclusive_content"),
            has_early_access: row.get("has_early_access"),
            has_priority_support: row.get("has_priority_support"),
            custom_perks: row.get("custom_perks"),
            max_subscribers: row.get("max_subscribers"),
            current_subscribers: row.get("current_subscribers"),
            position: row.get("position"),
            is_active: row.get("is_active"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        MembershipTierSummary {
            tier,
            active_subscribers: row.get("active_subscribers"),
        }
    })
    .fetch_all(&state.db_pool)
    .await?;

    Ok(rows)
}

pub async fn update_membership_tier(
    state: &AppState,
    tier_id: Uuid,
    user_id: Uuid,
    mut input: MembershipTierUpdateInput,
) -> Result<MembershipTier, AppError> {
    let ownership = sqlx::query(
        "SELECT c.creator_id FROM membership_tiers mt JOIN campaigns c ON c.id = mt.campaign_id WHERE mt.id = $1",
    )
    .bind(tier_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(record) = ownership else {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    };

    let creator_id: Uuid = record.get("creator_id");
    if creator_id != user_id {
        return Err(AppError::Unauthorized);
    }

    let mut builder = sqlx::QueryBuilder::new("UPDATE membership_tiers SET ");
    let mut separated = builder.separated(", ");
    let mut has_changes = false;

    if let Some(name) = input.name.take() {
        separated.push("name = ").push_bind(name);
        has_changes = true;
    }
    if let Some(description) = input.description.take() {
        separated.push("description = ").push_bind(description);
        has_changes = true;
    }
    if let Some(price_cents) = input.price_cents {
        separated.push("price_cents = ").push_bind(price_cents);
        has_changes = true;
    }
    if let Some(interval) = input.interval.take() {
        separated
            .push("interval = ")
            .push_bind(interval)
            .push("::subscription_interval");
        has_changes = true;
    }
    if let Some(perks) = input.perks.take() {
        separated.push("perks = ").push_bind(perks);
        has_changes = true;
    }
    if let Some(value) = input.has_exclusive_content {
        separated.push("has_exclusive_content = ").push_bind(value);
        has_changes = true;
    }
    if let Some(value) = input.has_early_access {
        separated.push("has_early_access = ").push_bind(value);
        has_changes = true;
    }
    if let Some(value) = input.has_priority_support {
        separated.push("has_priority_support = ").push_bind(value);
        has_changes = true;
    }
    if let Some(custom_perks) = input.custom_perks.take() {
        separated.push("custom_perks = ").push_bind(custom_perks);
        has_changes = true;
    }
    if let Some(max_subscribers) = input.max_subscribers.take() {
        separated
            .push("max_subscribers = ")
            .push_bind(max_subscribers);
        has_changes = true;
    }
    if let Some(position) = input.position {
        separated.push("position = ").push_bind(position);
        has_changes = true;
    }
    if let Some(is_active) = input.is_active {
        separated.push("is_active = ").push_bind(is_active);
        has_changes = true;
    }

    if !has_changes {
        return Err(AppError::Validation(vec![
            "No fields provided for update".to_string()
        ]));
    }

    separated.push("updated_at = NOW()");
    builder.push(" WHERE id = ").push_bind(tier_id);

    builder.build().execute(&state.db_pool).await?;

    let tier = sqlx::query_as::<_, MembershipTier>(
        r#"
        SELECT id, campaign_id, name, description, price_cents, interval::text AS interval, perks,
               has_exclusive_content, has_early_access, has_priority_support, custom_perks,
               max_subscribers, current_subscribers, position, is_active, created_at, updated_at
        FROM membership_tiers
        WHERE id = $1
        "#,
    )
    .bind(tier_id)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(tier)
}

pub async fn delete_membership_tier(
    state: &AppState,
    tier_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    let tier = sqlx::query(
        r#"
        SELECT mt.campaign_id, c.creator_id, mt.current_subscribers
        FROM membership_tiers mt
        JOIN campaigns c ON c.id = mt.campaign_id
        WHERE mt.id = $1
        "#,
    )
    .bind(tier_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(tier) = tier else {
        return Err(AppError::NotFound("Campaign not found".to_string()));
    };

    let creator_id: Uuid = tier.get("creator_id");
    if creator_id != user_id {
        return Err(AppError::Unauthorized);
    }

    let current_subscribers: i32 = tier.get("current_subscribers");
    if current_subscribers > 0 {
        sqlx::query(
            "UPDATE membership_tiers SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
        )
        .bind(tier_id)
        .execute(&state.db_pool)
        .await?;
    } else {
        sqlx::query("DELETE FROM membership_tiers WHERE id = $1")
            .bind(tier_id)
            .execute(&state.db_pool)
            .await?;
    }

    Ok(())
}
