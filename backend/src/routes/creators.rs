use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Deserialize;

use crate::{
    database::Database,
    models::User,
};

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
) -> Result<Json<User>, StatusCode> {
    let query = r#"
        SELECT id, email, name, username, avatar, bio, is_creator, created_at, updated_at 
        FROM users 
        WHERE username = $1 AND is_creator = true
    "#;
    
    match sqlx::query_as::<_, User>(query)
        .bind(&username)
        .fetch_one(&db.pool)
        .await
    {
        Ok(creator) => Ok(Json(creator)),
        Err(sqlx::Error::RowNotFound) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            tracing::error!("Failed to fetch creator {}: {}", username, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

