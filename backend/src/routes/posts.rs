use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::Claims,
    database::Database,
    models::{CreatePostRequest, Post},
};

#[derive(Debug, Deserialize)]
pub struct PostQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub user_id: Option<Uuid>,
}

pub fn post_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_posts).post(create_post))
        .route("/creator/:user_id", get(get_posts_by_creator))
        .route("/my-posts", get(get_my_posts))
        .route("/:id", get(get_post_by_id))
        .route("/:id", put(update_post))
        .route("/:id", delete(delete_post))
}

#[derive(Debug, Serialize)]
struct PostsResponse {
    success: bool,
    data: Vec<Post>,
    pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
struct PaginationInfo {
    page: u32,
    limit: u32,
    total: usize,
    pages: u32,
}

async fn get_posts(
    State(db): State<Database>,
    Query(params): Query<PostQuery>,
) -> Result<Json<PostsResponse>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let posts = if let Some(user_id) = params.user_id {
        sqlx::query_as::<_, Post>(
            "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(user_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
    } else {
        sqlx::query_as::<_, Post>(
            "SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
    }
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Frontend'in beklediği format
    let total = posts.len();
    let response = PostsResponse {
        success: true,
        data: posts,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages: ((total as f64) / (limit as f64)).ceil() as u32,
        },
    };
    Ok(Json(response))
}

async fn get_posts_by_creator(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Query(params): Query<PostQuery>,
) -> Result<Json<PostsResponse>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let posts = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(&user_id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching posts: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM posts WHERE user_id = $1"
    )
    .bind(&user_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error counting posts: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total = total_count as usize;
    let response = PostsResponse {
        success: true,
        data: posts,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages: ((total as f64) / (limit as f64)).ceil() as u32,
        },
    };
    Ok(Json(response))
}

async fn get_my_posts(
    State(db): State<Database>,
    claims: Claims,
    Query(params): Query<PostQuery>,
) -> Result<Json<PostsResponse>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;
    let user_id = &claims.sub;

    let posts = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(user_id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching my posts: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM posts WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error counting my posts: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total = total_count as usize;
    let response = PostsResponse {
        success: true,
        data: posts,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages: ((total as f64) / (limit as f64)).ceil() as u32,
        },
    };

    Ok(Json(response))
}

async fn create_post(
    State(db): State<Database>,
    Json(payload): Json<CreatePostRequest>,
) -> Result<Json<Post>, StatusCode> {
    // For now, use a default user_id for testing
    let user_id = "550e8400-e29b-41d4-a716-446655440000".to_string();

    println!("Creating post with payload: {:?}", payload);

    let post = sqlx::query_as::<_, Post>(
        r#"
        INSERT INTO posts (user_id, title, content, media_url, media_type, is_premium)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#
    )
    .bind(user_id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&payload.media_url)
    .bind(&payload.media_type)
    .bind(payload.is_premium.unwrap_or(false))
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error creating post: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(post))
}

async fn get_post_by_id(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
) -> Result<Json<Post>, StatusCode> {
    let post = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(post))
}

async fn update_post(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(payload): Json<CreatePostRequest>,
) -> Result<Json<Post>, StatusCode> {
    let user_id = claims.sub.parse::<Uuid>().unwrap();

    // Check if user owns the post
    let existing_post = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_post.is_none() {
        return Err(StatusCode::FORBIDDEN);
    }

    let post = sqlx::query_as::<_, Post>(
        r#"
        UPDATE posts 
        SET title = $2, content = $3, media_url = $4, media_type = $5, is_premium = $6, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#
    )
    .bind(id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&payload.media_url)
    .bind(&payload.media_type)
    .bind(payload.is_premium.unwrap_or(false))
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(post))
}

async fn delete_post(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<StatusCode, StatusCode> {
    let user_id = claims.sub.parse::<Uuid>().unwrap();

    // Check if user owns the post
    let existing_post = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_post.is_none() {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query("DELETE FROM posts WHERE id = $1")
        .bind(id)
        .execute(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
