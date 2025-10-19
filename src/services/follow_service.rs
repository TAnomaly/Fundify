use crate::error::AppError;
use crate::models::user::{PublicUserMinimal, User};
use crate::state::AppState;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

const MAX_PAGE_LIMIT: u32 = 50;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowMutationResult {
    pub follower_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowPagination {
    pub page: u32,
    pub limit: u32,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowListResponse {
    pub users: Vec<PublicUserMinimal>,
    pub pagination: FollowPagination,
}

#[derive(Debug, FromRow)]
struct FollowUserRow {
    id: Uuid,
    name: String,
    username: Option<String>,
    avatar: Option<String>,
    bio: Option<String>,
    created_at: DateTime<Utc>,
}

impl From<FollowUserRow> for PublicUserMinimal {
    fn from(row: FollowUserRow) -> Self {
        PublicUserMinimal {
            id: row.id,
            name: row.name,
            username: row.username,
            avatar: row.avatar,
            bio: row.bio,
            created_at: row.created_at,
        }
    }
}

pub async fn follow_user(
    state: &AppState,
    follower_id: Uuid,
    following_id: Uuid,
) -> Result<FollowMutationResult, AppError> {
    if follower_id == following_id {
        return Err(AppError::Validation(vec![
            "You cannot follow yourself".to_string()
        ]));
    }

    let target = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password_hash, name, username, avatar, banner_image, bio, creator_bio, role, is_creator, social_links, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(following_id)
    .fetch_optional(&state.db_pool)
    .await?;

    let target = target.ok_or(AppError::NotFound("User not found".to_string()))?;

    if !target.is_creator {
        return Err(AppError::Validation(vec![
            "Only creator accounts can be followed at this time".to_string(),
        ]));
    }

    sqlx::query(
        r#"
        INSERT INTO follows (id, follower_id, following_id)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(follower_id)
    .bind(following_id)
    .execute(&state.db_pool)
    .await?;

    let follower_count = follower_count(&state.db_pool, following_id).await?;

    Ok(FollowMutationResult { follower_count })
}

pub async fn unfollow_user(
    state: &AppState,
    follower_id: Uuid,
    following_id: Uuid,
) -> Result<FollowMutationResult, AppError> {
    sqlx::query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2")
        .bind(follower_id)
        .bind(following_id)
        .execute(&state.db_pool)
        .await?;

    let follower_count = follower_count(&state.db_pool, following_id).await?;

    Ok(FollowMutationResult { follower_count })
}

pub async fn list_followers(
    state: &AppState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<FollowListResponse, AppError> {
    list_follow_internal(state, user_id, page, limit, FollowDirection::Followers).await
}

pub async fn list_following(
    state: &AppState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<FollowListResponse, AppError> {
    list_follow_internal(state, user_id, page, limit, FollowDirection::Following).await
}

enum FollowDirection {
    Followers,
    Following,
}

impl FollowDirection {
    fn target_column(&self) -> &'static str {
        match self {
            FollowDirection::Followers => "f.following_id",
            FollowDirection::Following => "f.follower_id",
        }
    }

    fn join_column(&self) -> &'static str {
        match self {
            FollowDirection::Followers => "f.follower_id",
            FollowDirection::Following => "f.following_id",
        }
    }
}

async fn list_follow_internal(
    state: &AppState,
    user_id: Uuid,
    page: u32,
    limit: u32,
    direction: FollowDirection,
) -> Result<FollowListResponse, AppError> {
    let page = page.max(1);
    let limit = limit.clamp(1, MAX_PAGE_LIMIT);
    let offset = ((page - 1) as i64) * (limit as i64);

    let condition_column = direction.target_column();
    let join_column = direction.join_column();

    let query = format!(
        "SELECT u.id, u.name, u.username, u.avatar, u.bio, u.created_at
         FROM follows f
         JOIN users u ON u.id = {join_column}
         WHERE {condition_column} = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3"
    );

    let rows = sqlx::query_as::<_, FollowUserRow>(&query)
        .bind(user_id)
        .bind(limit as i64)
        .bind(offset)
        .fetch_all(&state.db_pool)
        .await?;

    let total_query =
        format!("SELECT COUNT(*)::bigint FROM follows f WHERE {condition_column} = $1");

    let total = sqlx::query_scalar::<_, i64>(&total_query)
        .bind(user_id)
        .fetch_one(&state.db_pool)
        .await?;

    let users = rows.into_iter().map(PublicUserMinimal::from).collect();

    Ok(FollowListResponse {
        users,
        pagination: FollowPagination { page, limit, total },
    })
}

async fn follower_count(pool: &sqlx::PgPool, user_id: Uuid) -> Result<i64, AppError> {
    Ok(
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*)::bigint FROM follows WHERE following_id = $1",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?,
    )
}
