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

#[derive(Debug, Serialize)]
pub struct TierAnalytics {
    pub tier_id: Uuid,
    pub tier_name: String,
    pub subscriber_count: i64,
    pub monthly_revenue: f64,
}

#[derive(Debug, Serialize)]
pub struct SubscriberAnalytics {
    pub user_id: Uuid,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub tier_name: String,
    pub subscribed_at: chrono::DateTime<chrono::Utc>,
    pub monthly_amount: f64,
}

#[derive(Debug, Serialize)]
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
    let total_subscribers = sqlx::query!(
        "SELECT COUNT(*) as count FROM subscriptions WHERE creator_id = $1 AND status = 'ACTIVE'",
        creator_id
    )
    .fetch_one(&state.db_pool)
    .await?
    .count
    .unwrap_or(0);

    // Get total revenue
    let total_revenue = sqlx::query!(
        "SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions WHERE creator_id = $1",
        creator_id
    )
    .fetch_one(&state.db_pool)
    .await?
    .total
    .unwrap_or(0.0);

    // Get monthly revenue (current month)
    let monthly_revenue = sqlx::query!(
        r#"
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM subscriptions 
        WHERE creator_id = $1 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
        "#,
        creator_id
    )
    .fetch_one(&state.db_pool)
    .await?
    .total
    .unwrap_or(0.0);

    // Get top tiers
    let top_tiers = sqlx::query!(
        r#"
        SELECT 
            mt.id as tier_id,
            mt.name as tier_name,
            COUNT(s.id) as subscriber_count,
            COALESCE(SUM(s.amount), 0) as monthly_revenue
        FROM membership_tiers mt
        LEFT JOIN subscriptions s ON mt.id = s.tier_id AND s.status = 'ACTIVE'
        WHERE mt.creator_id = $1
        GROUP BY mt.id, mt.name
        ORDER BY subscriber_count DESC
        LIMIT 5
        "#,
        creator_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    let tier_analytics = top_tiers
        .into_iter()
        .map(|tier| TierAnalytics {
            tier_id: tier.tier_id,
            tier_name: tier.tier_name,
            subscriber_count: tier.subscriber_count.unwrap_or(0),
            monthly_revenue: tier.monthly_revenue.unwrap_or(0.0),
        })
        .collect();

    // Get recent subscribers
    let recent_subscribers = sqlx::query!(
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
        "#,
        creator_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    let subscriber_analytics = recent_subscribers
        .into_iter()
        .map(|sub| SubscriberAnalytics {
            user_id: sub.user_id,
            user_name: sub.user_name,
            user_avatar: sub.user_avatar,
            tier_name: sub.tier_name,
            subscribed_at: sub.subscribed_at,
            monthly_amount: sub.monthly_amount,
        })
        .collect();

    // Get revenue chart (last 12 months)
    let revenue_chart = sqlx::query!(
        r#"
        SELECT 
            TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
            COALESCE(SUM(amount), 0) as revenue
        FROM subscriptions
        WHERE creator_id = $1
        AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
        "#,
        creator_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    let revenue_data = revenue_chart
        .into_iter()
        .map(|data| RevenueData {
            month: data.month,
            revenue: data.revenue.unwrap_or(0.0),
        })
        .collect();

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
    let target_users = sqlx::query!(
        r#"
        SELECT DISTINCT s.user_id
        FROM subscriptions s
        WHERE s.creator_id = $1 AND s.status = 'ACTIVE'
        "#,
        input.creator_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    // Send broadcast message to each user
    for user in target_users {
        sqlx::query!(
            r#"
            INSERT INTO messages (
                id, content, sender_id, recipient_id, creator_id, 
                message_type, is_read, created_at
            )
            VALUES ($1, $2, $3, $4, $5, 'BROADCAST', false, NOW())
            "#,
            uuid::Uuid::new_v4(),
            input.content,
            input.creator_id,
            user.user_id,
            input.creator_id
        )
        .execute(&state.db_pool)
        .await?;
    }

    Ok(())
}
