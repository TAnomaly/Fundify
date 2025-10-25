use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    auth::Claims,
    database::Database,
    models::User,
};

pub fn user_routes() -> Router<Database> {
    Router::new()
        .route("/me", get(get_current_user))
        .route("/me/campaigns", get(get_user_campaigns))
        .route("/become-creator", post(become_creator))
        .route("/:id", get(get_user_by_id))
        .route("/:id", put(update_user))
}

async fn get_current_user(
    State(db): State<Database>,
    claims: Claims,
) -> Result<Json<User>, StatusCode> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(&claims.sub)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(user))
}

async fn get_user_by_id(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, StatusCode> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(user))
}

async fn update_user(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<User>, StatusCode> {
    // Only allow users to update their own profile
    if claims.sub.parse::<Uuid>().unwrap() != id {
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
        "#
    )
    .bind(id)
    .bind(display_name)
    .bind(bio)
    .bind(is_creator)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(user))
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

#[derive(Debug, Deserialize)]
struct BecomeCreatorRequest {
    name: Option<String>,
    username: Option<String>,
    email: Option<String>,
}

async fn become_creator(
    State(db): State<Database>,
    axum::extract::Json(payload): axum::extract::Json<BecomeCreatorRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    println!("🔄 Someone is trying to become a creator (no auth required)");
    println!("📝 Received user data: {:?}", payload);
    
    // Generate a unique user ID
    let user_id = uuid::Uuid::new_v4().to_string();
    
    // Use provided user data or generate defaults
    let name = payload.name.unwrap_or_else(|| "Creator".to_string());
    let username = payload.username.unwrap_or_else(|| "creator".to_string());
    let email = payload.email.unwrap_or_else(|| "creator@fundify.com".to_string());
    
    println!("🎯 Using user data - Name: {}, Username: {}, Email: {}", name, username, email);
    
    // First, try to insert or update user
    let result = sqlx::query(
        "INSERT INTO users (id, email, username, name, is_creator, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (id) 
         DO UPDATE SET is_creator = true, updated_at = NOW()"
    )
    .bind(&user_id)
    .bind(&email)
    .bind(&username)
    .bind(&name)
    .execute(&db.pool)
    .await
    .map_err(|e| {
        println!("❌ Error creating/updating user: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    println!("✅ User created/updated in database. Rows affected: {}", result.rows_affected());
    println!("🎉 Creator status saved to database!");
    
    let response = serde_json::json!({
        "success": true,
        "message": "Successfully became a creator",
        "userId": user_id,
        "username": username
    });
    
    Ok(Json(response))
}