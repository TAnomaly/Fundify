use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::{database::Database, middleware::optional_auth::MaybeClaims, models::User};

#[derive(Debug, Deserialize)]
pub struct CreatorQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub fn creator_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_creators))
        .route("/:username", get(get_creator_by_username))
}

async fn get_creators(
    State(db): State<Database>,
    Query(params): Query<CreatorQuery>,
) -> Result<Json<Vec<User>>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100); // Max 100 creators
    let offset = params.offset.unwrap_or(0);

    let query = r#"
        SELECT id, email, name, username, avatar, bio, is_creator, created_at, updated_at 
        FROM users 
        WHERE is_creator = true 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
    "#;

    match sqlx::query_as::<_, User>(query)
        .bind(limit)
        .bind(offset)
        .fetch_all(&db.pool)
        .await
    {
        Ok(creators) => Ok(Json(creators)),
        Err(e) => {
            tracing::error!("Failed to fetch creators: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_creator_by_username(
    State(db): State<Database>,
    Path(username): Path<String>,
    MaybeClaims(maybe_claims): MaybeClaims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let query = r#"
        SELECT id, email, name, username, avatar, bio, is_creator, created_at, updated_at 
        FROM users 
        WHERE username = $1 AND is_creator = true
    "#;

    let creator = sqlx::query_as::<_, User>(query)
        .bind(&username)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            other => {
                tracing::error!("Failed to fetch creator {}: {}", username, other);
                StatusCode::INTERNAL_SERVER_ERROR
            }
        })?;

    let follower_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM follows WHERE following_id = $1")
            .bind(&creator.id)
            .fetch_one(&db.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to count followers for {}: {}", username, e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

    let following_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM follows WHERE follower_id = $1")
            .bind(&creator.id)
            .fetch_one(&db.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to count following for {}: {}", username, e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

    let is_following = if let Some(claims) = maybe_claims {
        sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2)",
        )
        .bind(&claims.sub)
        .bind(&creator.id)
        .fetch_one(&db.pool)
        .await
        .unwrap_or(false)
    } else {
        false
    };

    Ok(Json(json!({
        "id": creator.id,
        "email": creator.email,
        "name": creator.name,
        "username": creator.username,
        "avatar": creator.avatar,
        "bio": creator.bio,
        "isCreator": creator.is_creator,
        "createdAt": creator.created_at,
        "updatedAt": creator.updated_at,
        "followerCount": follower_count,
        "followingCount": following_count,
        "isFollowing": is_following
    })))
}
