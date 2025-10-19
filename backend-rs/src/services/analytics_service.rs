use crate::error::AppError;
use crate::state::SharedState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct AnalyticsResponse {
    pub total_subscribers: i64,
    pub total_revenue: f64,
    pub monthly_revenue: f64,
    pub top_tiers: Vec<TierAnalytics>,
    pub recent_subscribers: Vec<SubscriberAnalytics>,
    pub revenue_chart: Vec<RevenueData>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TierAnalytics {
    pub tier_id: Uuid,
    pub tier_name: String,
    pub subscriber_count: i64,
    pub monthly_revenue: f64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SubscriberAnalytics {
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub tier_name: String,
    pub subscribed_at: chrono::DateTime<chrono::Utc>,
    pub monthly_amount: f64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct RevenueData {
    pub month: String,
    pub revenue: f64,
}

#[derive(Debug, Serialize)]
pub struct SubscriberListResponse {
    pub subscribers: Vec<SubscriberDetail>,
    pub total_count: i64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SubscriberDetail {
    pub user_id: Uuid,
    pub user_name: String,
    pub user_email: String,
    pub user_avatar: Option<String>,
    pub tier_id: Uuid,
    pub tier_name: String,
    pub subscribed_at: chrono::DateTime<chrono::Utc>,
    pub status: String,
    pub monthly_amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct BulkMessageRequest {
    pub content: String,
    pub creator_id: Uuid,
    pub tier_ids: Vec<Uuid>,
    pub user_ids: Vec<Uuid>,
}

pub async fn get_analytics(
    state: &SharedState,
    creator_id: Uuid,
) -> Result<AnalyticsResponse, AppError> {
    // Get total subscribers
    let total_subscribers: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM subscriptions WHERE creator_id = $1 AND status = 'ACTIVE'"
    )
    .bind(creator_id)
    .fetch_one(&state.db_pool)
    .await?;

    // Get total revenue
    let total_revenue: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(amount), 0)::FLOAT8 FROM subscriptions WHERE creator_id = $1"
    )
    .bind(creator_id)
    .fetch_one(&state.db_pool)
    .await?;

    // Get monthly revenue (current month)
    let monthly_revenue: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(amount), 0)::FLOAT8
        FROM subscriptions
        WHERE creator_id = $1
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        "#
    )
    .bind(creator_id)
    .fetch_one(&state.db_pool)
    .await?;

    // Get top tiers
    let tier_analytics = sqlx::query_as::<_, TierAnalytics>(
        r#"
        SELECT
            mt.id as tier_id,
            mt.name as tier_name,
            COUNT(s.id)::BIGINT as subscriber_count,
            COALESCE(SUM(s.amount), 0)::FLOAT8 as monthly_revenue
        FROM membership_tiers mt
        LEFT JOIN subscriptions s ON mt.id = s.tier_id AND s.status = 'ACTIVE'
        WHERE mt.creator_id = $1
        GROUP BY mt.id, mt.name
        ORDER BY subscriber_count DESC
        LIMIT 5
        "#
    )
    .bind(creator_id)
    .fetch_all(&state.db_pool)
    .await?;

    // Get recent subscribers
    let subscriber_analytics = sqlx::query_as::<_, SubscriberAnalytics>(
        r#"
        SELECT
            s.user_id,
            u.name as user_name,
            u.avatar as user_avatar,
            mt.name as tier_name,
            s.created_at as subscribed_at,
            s.amount as monthly_amount
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN membership_tiers mt ON s.tier_id = mt.id
        WHERE s.creator_id = $1 AND s.status = 'ACTIVE'
        ORDER BY s.created_at DESC
        LIMIT 10
        "#
    )
    .bind(creator_id)
    .fetch_all(&state.db_pool)
    .await?;

    // Get revenue chart (last 12 months)
    let revenue_data = sqlx::query_as::<_, RevenueData>(
        r#"
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
            COALESCE(SUM(amount), 0)::FLOAT8 as revenue
        FROM subscriptions
        WHERE creator_id = $1
        AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
        "#
    )
    .bind(creator_id)
    .fetch_all(&state.db_pool)
    .await?;

    Ok(AnalyticsResponse {
        total_subscribers,
        total_revenue,
        monthly_revenue,
        top_tiers: tier_analytics,
        recent_subscribers: subscriber_analytics,
        revenue_chart: revenue_data,
    })
}

pub async fn get_subscribers(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    tier_id: Option<Uuid>,
    search: Option<String>,
) -> Result<SubscriberListResponse, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "s.creator_id = $1 AND s.status = 'ACTIVE'".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(tier) = tier_id {
        where_clause.push_str(&format!(" AND s.tier_id = ${}", param_count + 1));
        params.push(Box::new(tier));
        param_count += 1;
    }

    if let Some(search_term) = search {
        where_clause.push_str(&format!(" AND (u.name ILIKE ${} OR u.email ILIKE ${})", param_count + 1, param_count + 2));
        params.push(Box::new(format!("%{}%", search_term)));
        params.push(Box::new(format!("%{}%", search_term)));
        param_count += 2;
    }

    let query_str = format!(
        r#"
        SELECT 
            s.user_id,
            u.name as user_name,
            u.email as user_email,
            u.avatar as user_avatar,
            s.tier_id,
            mt.name as tier_name,
            s.created_at as subscribed_at,
            s.status,
            s.amount as monthly_amount
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN membership_tiers mt ON s.tier_id = mt.id
        WHERE {}
        ORDER BY s.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(SubscriberListResponse {
        subscribers: vec![],
        total_count: 0,
        page,
        limit,
    })
}

pub async fn send_bulk_message(
    state: &SharedState,
    input: BulkMessageRequest,
) -> Result<(), AppError> {
    // Get target users based on criteria
    let mut where_conditions = vec!["s.creator_id = $1".to_string()];
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if !input.tier_ids.is_empty() {
        where_conditions.push(format!("s.tier_id = ANY(${})", param_count + 1));
        params.push(Box::new(input.tier_ids));
        param_count += 1;
    }

    if !input.user_ids.is_empty() {
        where_conditions.push(format!("s.user_id = ANY(${})", param_count + 1));
        params.push(Box::new(input.user_ids));
        param_count += 1;
    }

    let where_clause = where_conditions.join(" AND ");

    // For now, use a simple query without dynamic WHERE clause
    let target_users: Vec<(Uuid,)> = sqlx::query_as(
        r#"
        SELECT DISTINCT s.user_id
        FROM subscriptions s
        WHERE s.creator_id = $1 AND s.status = 'ACTIVE'
        "#
    )
    .bind(input.creator_id)
    .fetch_all(&state.db_pool)
    .await?;

    // Send broadcast message to each user
    for (user_id,) in target_users {
        sqlx::query(
            r#"
            INSERT INTO messages (
                id, content, sender_id, recipient_id, creator_id,
                message_type, is_read, created_at
            )
            VALUES ($1, $2, $3, $4, $5, 'BROADCAST', false, NOW())
            "#
        )
        .bind(uuid::Uuid::new_v4())
        .bind(&input.content)
        .bind(input.creator_id)
        .bind(user_id)
        .bind(input.creator_id)
        .execute(&state.db_pool)
        .await?;
    }

    Ok(())
}
