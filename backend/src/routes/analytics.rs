use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    pub period: Option<String>,
}

pub fn analytics_routes() -> Router<Database> {
    Router::new().route("/", get(get_dashboard))
}

async fn get_dashboard(
    State(db): State<Database>,
    claims: Claims,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let period_label = query.period.unwrap_or_else(|| "30days".to_string());
    let days = match period_label.as_str() {
        "7days" => 7,
        "30days" => 30,
        "90days" => 90,
        "12months" => 365,
        _ => 30,
    };

    let total_posts = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM posts WHERE user_id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&db.pool)
    .await
    .unwrap_or(0);

    let total_articles = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM articles WHERE author_id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&db.pool)
    .await
    .unwrap_or(0);

    let total_events = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM events WHERE host_id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&db.pool)
    .await
    .unwrap_or(0);

    let recent_posts_rows = sqlx::query(
        r#"
        SELECT id, title, created_at
        FROM posts
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
        "#,
    )
    .bind(&claims.sub)
    .fetch_all(&db.pool)
    .await
    .unwrap_or_else(|_| Vec::new());

    let recent_posts = recent_posts_rows
        .into_iter()
        .map(|row| {
            json!({
                "id": row.get::<Uuid, _>("id"),
                "title": row.get::<String, _>("title"),
                "likeCount": 0,
            "commentCount": 0,
            "createdAt": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
        })
    })
    .collect::<Vec<_>>();

    let trend_points = (0..days)
        .rev()
        .step_by((days.max(1) / 10).max(1) as usize)
        .map(|offset| {
            let date = Utc::now() - Duration::days(offset as i64);
            json!({
                "date": date.date_naive().to_string(),
                "revenue": 0,
                "subscribers": 0
            })
        })
        .collect::<Vec<_>>();
    let revenue_trend = trend_points.clone();
    let subscriber_trend = trend_points;

    let response = json!({
        "success": true,
        "data": {
            "overview": {
                "activeSubscribers": 0,
                "newSubscribers": 0,
                "canceledSubscribers": 0,
                "monthlyRevenue": 0,
                "totalPosts": total_posts,
                "totalPolls": 0,
                "totalEvents": total_events,
                "totalArticles": total_articles,
                "totalGoals": 0,
                "completedGoals": 0,
                "totalLikes": 0,
                "totalComments": 0,
                "totalDownloads": 0
            },
            "trends": {
                "revenue": revenue_trend,
                "subscribers": subscriber_trend
            },
            "content": {
                "postsInPeriod": total_posts,
                "topPosts": recent_posts
            },
            "tiers": []
        }
    });

    Ok(Json(response))
}
