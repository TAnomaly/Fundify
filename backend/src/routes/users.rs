use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;

use crate::{auth::Claims, database::Database, models::User};

#[derive(Debug, Deserialize)]
struct PaginationParams {
    page: Option<u32>,
    limit: Option<u32>,
}

pub fn user_routes() -> Router<Database> {
    Router::new()
        .route("/me", get(get_current_user))
        .route("/me/campaigns", get(get_user_campaigns))
        .route("/become-creator", post(become_creator))
        .route("/:id", get(get_user_by_id))
        .route("/:id", put(update_user))
        .route("/:id/follow", post(follow_user).delete(unfollow_user))
        .route("/:id/followers", get(get_followers))
        .route("/:id/following", get(get_following))
}

async fn get_current_user(
    State(db): State<Database>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(&claims.sub)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "success": true,
        "data": user
    })))
}

async fn get_user_by_id(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(&id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(json!({
        "success": true,
        "data": user
    })))
}

async fn update_user(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Only allow users to update their own profile
    if claims.sub != id {
        return Err(StatusCode::FORBIDDEN);
    }

    let display_name = payload.get("display_name").and_then(|v| v.as_str());
    let bio = payload.get("bio").and_then(|v| v.as_str());
    let is_creator = payload.get("is_creator").and_then(|v| v.as_bool());

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users 
        SET display_name = COALESCE($2, display_name),
            bio = COALESCE($3, bio),
            is_creator = COALESCE($4, is_creator),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(display_name)
    .bind(bio)
    .bind(is_creator)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "success": true,
        "data": user
    })))
}

async fn get_user_campaigns(
    State(db): State<Database>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Get campaigns created by the current user
    let campaigns = sqlx::query(
        "SELECT id, title, description, goal_amount, current_amount, status, slug, created_at, updated_at 
         FROM campaigns WHERE creator_id = $1 ORDER BY created_at DESC"
    )
    .bind(&claims.sub)
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let campaign_list: Vec<serde_json::Value> = campaigns
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "id": row.get::<uuid::Uuid, _>("id"),
                "title": row.get::<String, _>("title"),
                "description": row.get::<String, _>("description"),
                "goal_amount": row.get::<f64, _>("goal_amount"),
                "current_amount": row.get::<Option<f64>, _>("current_amount").unwrap_or(0.0),
                "status": row.get::<String, _>("status"),
                "slug": row.get::<String, _>("slug"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
            })
        })
        .collect();

    let response = serde_json::json!({
        "success": true,
        "data": campaign_list
    });

    Ok(Json(response))
}

async fn follow_user(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if claims.sub == id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Ensure target exists
    sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE id = $1")
        .bind(&id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
        .and_then(|count| {
            if count == 0 {
                Err(StatusCode::NOT_FOUND)
            } else {
                Ok(count)
            }
        })?;

    let result = sqlx::query(
        r#"
        INSERT INTO follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT (follower_id, following_id) DO NOTHING
        "#,
    )
    .bind(&claims.sub)
    .bind(&id)
    .execute(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let follower_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM follows WHERE following_id = $1")
            .bind(&id)
            .fetch_one(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = json!({
        "success": true,
        "data": {
            "followerCount": follower_count,
            "updated": result.rows_affected() > 0
        }
    });

    Ok(Json(response))
}

async fn unfollow_user(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let result = sqlx::query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2")
        .bind(&claims.sub)
        .bind(&id)
        .execute(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let follower_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM follows WHERE following_id = $1")
            .bind(&id)
            .fetch_one(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = json!({
        "success": true,
        "data": {
            "followerCount": follower_count,
            "updated": result.rows_affected() > 0
        }
    });

    Ok(Json(response))
}

#[derive(Serialize)]
struct FollowPagination {
    page: u32,
    limit: u32,
    total: usize,
}

async fn get_followers(
    State(db): State<Database>,
    Path(id): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).max(1);
    let offset = (page - 1) * limit;

    let followers = sqlx::query_as::<_, User>(
        r#"
        SELECT u.*
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM follows WHERE following_id = $1")
        .bind(&id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? as usize;

    let response = json!({
        "success": true,
        "data": {
            "followers": followers,
            "pagination": FollowPagination {
                page,
                limit,
                total,
            }
        }
    });

    Ok(Json(response))
}

async fn get_following(
    State(db): State<Database>,
    Path(id): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).max(1);
    let offset = (page - 1) * limit;

    let following = sqlx::query_as::<_, User>(
        r#"
        SELECT u.*
        FROM follows f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM follows WHERE follower_id = $1")
        .bind(&id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)? as usize;

    let response = json!({
        "success": true,
        "data": {
            "following": following,
            "pagination": FollowPagination {
                page,
                limit,
                total,
            }
        }
    });

    Ok(Json(response))
}

#[derive(Debug, Deserialize)]
struct BecomeCreatorRequest {
    name: Option<String>,
    username: Option<String>,
    email: Option<String>,
}

async fn become_creator(
    State(db): State<Database>,
    claims: Claims,
    axum::extract::Json(payload): axum::extract::Json<BecomeCreatorRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = claims.sub;

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET 
            username = COALESCE($2, username),
            email = COALESCE($3, email),
            name = COALESCE($4, name),
            is_creator = true,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(&user_id)
    .bind(payload.username.as_ref())
    .bind(payload.email.as_ref())
    .bind(payload.name.as_ref())
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        println!("❌ Error updating user to creator: {:?}", e);
        match e {
            sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    })?;

    let response = serde_json::json!({
        "success": true,
        "message": "Successfully became a creator",
        "data": user
    });

    Ok(Json(response))
}
