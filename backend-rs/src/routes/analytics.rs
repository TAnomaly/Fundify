use axum::{extract::State, routing::get, Json, Router};

use crate::{
    auth::AuthUser,
    error::AppError,
    models::analytics::{CreatorAnalytics, GlobalAnalytics},
    state::AppState,
};

pub fn analytics_router() -> Router<AppState> {
    Router::new()
        .route("/global", get(get_global_analytics))
        .route("/creator", get(get_creator_analytics))
}

async fn get_global_analytics(
    State(state): State<AppState>,
) -> Result<Json<GlobalAnalytics>, AppError> {
    let analytics = sqlx::query_as!(
        GlobalAnalytics,
        r#"
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE "isCreator" = true) as total_creators,
            (SELECT COUNT(*) FROM campaigns) as total_campaigns,
            (SELECT SUM(amount) FROM donations) as total_donations_volume,
            (SELECT COUNT(*) FROM creator_posts) as total_posts,
            (SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE') as total_subscriptions
        "#
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(analytics))
}

async fn get_creator_analytics(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<CreatorAnalytics>, AppError> {
    let analytics = sqlx::query_as!(
        CreatorAnalytics,
        r#"
        WITH CreatorData AS (
            SELECT
                u.id as creator_id,
                (SELECT COUNT(*) FROM subscriptions WHERE "creatorId" = u.id AND status = 'ACTIVE') as total_subscribers,
                (SELECT SUM(amount) FROM donations WHERE "campaignId" IN (SELECT id FROM campaigns WHERE "creatorId" = u.id)) as total_donations_volume,
                (SELECT COUNT(*) FROM creator_posts WHERE "authorId" = u.id) as total_posts
            FROM users u
            WHERE u.id = $1
        )
        SELECT
            creator_id,
            COALESCE(total_subscribers, 0) as total_subscribers,
            COALESCE(total_donations_volume, 0) as total_donations_volume,
            COALESCE(total_posts, 0) as total_posts
        FROM CreatorData
        "#,
        user.0.user_id
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(analytics))
}
