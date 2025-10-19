use crate::error::AppError;
use crate::models::membership::{BasicUser, MembershipTier, Subscription, SubscriptionWithDetails};
use crate::state::AppState;
use chrono::{Duration, Utc};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct SubscriptionInput {
    pub tier_id: Uuid,
    pub creator_id: Uuid,
}

pub async fn create_subscription(
    state: &AppState,
    subscriber_id: Uuid,
    input: SubscriptionInput,
) -> Result<SubscriptionWithDetails, AppError> {
    // load tier
    let tier = sqlx::query_as::<_, MembershipTier>(
        r#"
        SELECT id, campaign_id, name, description, price_cents, interval::text AS interval, perks,
               has_exclusive_content, has_early_access, has_priority_support, custom_perks,
               max_subscribers, current_subscribers, position, is_active, created_at, updated_at
        FROM membership_tiers
        WHERE id = $1
        "#,
    )
    .bind(input.tier_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(tier) = tier else {
        return Err(AppError::NotFound("Tier not found".to_string()));
    };

    if !tier.is_active {
        return Err(AppError::Validation(vec![
            "This tier is no longer available".to_string(),
        ]));
    }

    if let Some(max) = tier.max_subscribers {
        if tier.current_subscribers >= max {
            return Err(AppError::Validation(vec![
                "This tier has reached its subscriber limit".to_string(),
            ]));
        }
    }

    // ensure not already active subscription
    let existing = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT id FROM subscriptions WHERE subscriber_id = $1 AND creator_id = $2 AND status = 'ACTIVE'",
    )
    .bind(subscriber_id)
    .bind(input.creator_id)
    .fetch_optional(&state.db_pool)
    .await?;

    if existing.is_some() {
        return Err(AppError::Validation(vec![
            "You are already subscribed to this creator".to_string(),
        ]));
    }

    let start_date = Utc::now();
    let next_billing_date = match tier.interval.as_str() {
        "YEARLY" => start_date + Duration::days(365),
        _ => start_date + Duration::days(30),
    };

    let subscription_id = Uuid::new_v4();

    let subscription = sqlx::query_as::<_, Subscription>(
        r#"
        INSERT INTO subscriptions (
            id,
            subscriber_id,
            creator_id,
            tier_id,
            status,
            start_date,
            next_billing_date
        ) VALUES (
            $1, $2, $3, $4, 'ACTIVE'::subscription_status, $5, $6
        )
        RETURNING id, subscriber_id, creator_id, tier_id, status::text AS status, start_date,
                  next_billing_date, end_date, cancelled_at, stripe_subscription_id,
                  stripe_customer_id, created_at, updated_at
        "#,
    )
    .bind(subscription_id)
    .bind(subscriber_id)
    .bind(input.creator_id)
    .bind(tier.id)
    .bind(start_date)
    .bind(next_billing_date)
    .fetch_one(&state.db_pool)
    .await?;

    sqlx::query(
        "UPDATE membership_tiers SET current_subscribers = current_subscribers + 1 WHERE id = $1",
    )
    .bind(tier.id)
    .execute(&state.db_pool)
    .await?;

    let creator =
        sqlx::query_as::<_, BasicUser>("SELECT id, name, avatar FROM users WHERE id = $1")
            .bind(input.creator_id)
            .fetch_one(&state.db_pool)
            .await?;

    let subscriber =
        sqlx::query_as::<_, BasicUser>("SELECT id, name, avatar FROM users WHERE id = $1")
            .bind(subscriber_id)
            .fetch_one(&state.db_pool)
            .await?;

    Ok(SubscriptionWithDetails {
        subscription,
        tier,
        creator,
        subscriber,
    })
}

pub async fn list_my_subscriptions(
    state: &AppState,
    subscriber_id: Uuid,
) -> Result<Vec<SubscriptionWithDetails>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status::text AS status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.stripe_subscription_id,
            s.stripe_customer_id,
            s.created_at,
            s.updated_at,
            mt.campaign_id AS tier_campaign_id,
            mt.name AS tier_name,
            mt.description AS tier_description,
            mt.price_cents,
            mt.interval::text AS tier_interval,
            mt.perks AS tier_perks,
            mt.has_exclusive_content,
            mt.has_early_access,
            mt.has_priority_support,
            mt.custom_perks,
            mt.max_subscribers,
            mt.current_subscribers,
            mt.position AS tier_position,
            mt.is_active,
            mt.created_at AS tier_created_at,
            mt.updated_at AS tier_updated_at,
            creator.id AS creator_user_id,
            creator.name AS creator_name,
            creator.avatar AS creator_avatar,
            subscriber.id AS subscriber_user_id,
            subscriber.name AS subscriber_name,
            subscriber.avatar AS subscriber_avatar
        FROM subscriptions s
        JOIN membership_tiers mt ON mt.id = s.tier_id
        JOIN users creator ON creator.id = s.creator_id
        JOIN users subscriber ON subscriber.id = s.subscriber_id
        WHERE s.subscriber_id = $1
        ORDER BY s.created_at DESC
        "#,
    )
    .bind(subscriber_id)
    .map(|row: sqlx::postgres::PgRow| row_to_subscription_details(row))
    .fetch_all(&state.db_pool)
    .await?;

    Ok(rows)
}

pub async fn list_my_subscribers(
    state: &AppState,
    creator_id: Uuid,
) -> Result<Vec<SubscriptionWithDetails>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status::text AS status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.stripe_subscription_id,
            s.stripe_customer_id,
            s.created_at,
            s.updated_at,
            mt.campaign_id AS tier_campaign_id,
            mt.name AS tier_name,
            mt.description AS tier_description,
            mt.price_cents,
            mt.interval::text AS tier_interval,
            mt.perks AS tier_perks,
            mt.has_exclusive_content,
            mt.has_early_access,
            mt.has_priority_support,
            mt.custom_perks,
            mt.max_subscribers,
            mt.current_subscribers,
            mt.position AS tier_position,
            mt.is_active,
            mt.created_at AS tier_created_at,
            mt.updated_at AS tier_updated_at,
            creator.id AS creator_user_id,
            creator.name AS creator_name,
            creator.avatar AS creator_avatar,
            subscriber.id AS subscriber_user_id,
            subscriber.name AS subscriber_name,
            subscriber.avatar AS subscriber_avatar
        FROM subscriptions s
        JOIN membership_tiers mt ON mt.id = s.tier_id
        JOIN users creator ON creator.id = s.creator_id
        JOIN users subscriber ON subscriber.id = s.subscriber_id
        WHERE s.creator_id = $1
        ORDER BY s.created_at DESC
        "#,
    )
    .bind(creator_id)
    .map(|row: sqlx::postgres::PgRow| row_to_subscription_details(row))
    .fetch_all(&state.db_pool)
    .await?;

    Ok(rows)
}

pub async fn get_recent_subscriptions(
    state: &AppState,
    creator_id: Uuid,
    limit: i64,
) -> Result<Vec<SubscriptionWithDetails>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id,
            s.subscriber_id,
            s.creator_id,
            s.tier_id,
            s.status::text AS status,
            s.start_date,
            s.next_billing_date,
            s.end_date,
            s.cancelled_at,
            s.stripe_subscription_id,
            s.stripe_customer_id,
            s.created_at,
            s.updated_at,
            mt.campaign_id AS tier_campaign_id,
            mt.name AS tier_name,
            mt.description AS tier_description,
            mt.price_cents,
            mt.interval::text AS tier_interval,
            mt.perks AS tier_perks,
            mt.has_exclusive_content,
            mt.has_early_access,
            mt.has_priority_support,
            mt.custom_perks,
            mt.max_subscribers,
            mt.current_subscribers,
            mt.position AS tier_position,
            mt.is_active,
            mt.created_at AS tier_created_at,
            mt.updated_at AS tier_updated_at,
            creator.id AS creator_user_id,
            creator.name AS creator_name,
            creator.avatar AS creator_avatar,
            subscriber.id AS subscriber_user_id,
            subscriber.name AS subscriber_name,
            subscriber.avatar AS subscriber_avatar
        FROM subscriptions s
        JOIN membership_tiers mt ON mt.id = s.tier_id
        JOIN users creator ON creator.id = s.creator_id
        JOIN users subscriber ON subscriber.id = s.subscriber_id
        WHERE s.creator_id = $1
        ORDER BY s.created_at DESC
        LIMIT $2
        "#,
    )
    .bind(creator_id)
    .bind(limit)
    .map(|row: sqlx::postgres::PgRow| row_to_subscription_details(row))
    .fetch_all(&state.db_pool)
    .await?;

    Ok(rows)
}

pub async fn cancel_subscription(
    state: &AppState,
    subscription_id: Uuid,
    requester_id: Uuid,
) -> Result<Subscription, AppError> {
    let subscription = sqlx::query_as::<_, Subscription>(
        r#"
        SELECT id, subscriber_id, creator_id, tier_id, status::text AS status, start_date,
               next_billing_date, end_date, cancelled_at, stripe_subscription_id, stripe_customer_id,
               created_at, updated_at
        FROM subscriptions
        WHERE id = $1
        "#,
    )
    .bind(subscription_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let Some(subscription) = subscription else {
        return Err(AppError::NotFound("Tier not found".to_string()));
    };

    if subscription.subscriber_id != requester_id && subscription.creator_id != requester_id {
        return Err(AppError::Unauthorized);
    }

    if subscription.status == "CANCELLED" {
        return Ok(subscription);
    }

    sqlx::query(
        "UPDATE subscriptions SET status = 'CANCELLED', end_date = NOW(), cancelled_at = NOW(), updated_at = NOW() WHERE id = $1",
    )
    .bind(subscription_id)
    .execute(&state.db_pool)
    .await?;

    sqlx::query("UPDATE membership_tiers SET current_subscribers = GREATEST(current_subscribers - 1, 0) WHERE id = $1")
        .bind(subscription.tier_id)
        .execute(&state.db_pool)
        .await?;

    let updated = get_subscription(&state.db_pool, subscription_id).await?;
    Ok(updated)
}

pub async fn toggle_subscription_pause(
    state: &AppState,
    subscription_id: Uuid,
    requester_id: Uuid,
) -> Result<Subscription, AppError> {
    let subscription = get_subscription(&state.db_pool, subscription_id).await?;

    if subscription.subscriber_id != requester_id {
        return Err(AppError::Unauthorized);
    }

    let new_status = match subscription.status.as_str() {
        "ACTIVE" => "PAUSED",
        "PAUSED" => "ACTIVE",
        other => {
            return Err(AppError::Validation(vec![format!(
                "Cannot toggle subscription in {other} state"
            )]));
        }
    };

    sqlx::query("UPDATE subscriptions SET status = $1::subscription_status, updated_at = NOW() WHERE id = $2")
        .bind(new_status)
        .bind(subscription_id)
        .execute(&state.db_pool)
        .await?;

    get_subscription(&state.db_pool, subscription_id).await
}

fn row_to_subscription_details(row: sqlx::postgres::PgRow) -> SubscriptionWithDetails {
    let subscription = Subscription {
        id: row.get("id"),
        subscriber_id: row.get("subscriber_id"),
        creator_id: row.get("creator_id"),
        tier_id: row.get("tier_id"),
        status: row.get("status"),
        start_date: row.get("start_date"),
        next_billing_date: row.get("next_billing_date"),
        end_date: row.get("end_date"),
        cancelled_at: row.get("cancelled_at"),
        stripe_subscription_id: row.get("stripe_subscription_id"),
        stripe_customer_id: row.get("stripe_customer_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let tier = MembershipTier {
        id: row.get("tier_id"),
        campaign_id: row.get("tier_campaign_id"),
        name: row.get("tier_name"),
        description: row.get("tier_description"),
        price_cents: row.get("price_cents"),
        interval: row.get::<String, _>("tier_interval"),
        perks: row.get("tier_perks"),
        has_exclusive_content: row.get("has_exclusive_content"),
        has_early_access: row.get("has_early_access"),
        has_priority_support: row.get("has_priority_support"),
        custom_perks: row.get("custom_perks"),
        max_subscribers: row.get("max_subscribers"),
        current_subscribers: row.get("current_subscribers"),
        position: row.get("tier_position"),
        is_active: row.get("is_active"),
        created_at: row.get("tier_created_at"),
        updated_at: row.get("tier_updated_at"),
    };

    let creator = BasicUser {
        id: row.get("creator_user_id"),
        name: row.get("creator_name"),
        avatar: row.get("creator_avatar"),
    };

    let subscriber = BasicUser {
        id: row.get("subscriber_user_id"),
        name: row.get("subscriber_name"),
        avatar: row.get("subscriber_avatar"),
    };

    SubscriptionWithDetails {
        subscription,
        tier,
        creator,
        subscriber,
    }
}

async fn get_subscription(
    db: &sqlx::PgPool,
    subscription_id: Uuid,
) -> Result<Subscription, AppError> {
    let subscription = sqlx::query_as::<_, Subscription>(
        r#"
        SELECT id, subscriber_id, creator_id, tier_id, status::text AS status, start_date,
               next_billing_date, end_date, cancelled_at, stripe_subscription_id, stripe_customer_id,
               created_at, updated_at
        FROM subscriptions
        WHERE id = $1
        "#,
    )
    .bind(subscription_id)
    .fetch_optional(db)
    .await?;

    subscription.ok_or(AppError::NotFound("Subscription not found".to_string()))
}
