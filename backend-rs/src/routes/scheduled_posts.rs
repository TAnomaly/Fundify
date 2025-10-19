use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    error::AppError,
    models::{
        scheduled_post::{
            CreateScheduledPostRequest, PublishScheduledPostsResponse, ScheduledPostWithRelations,
            UpdateScheduledPostRequest,
        },
        user::User,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct GetScheduledPostsQuery {
    pub published: Option<bool>,
}

pub fn scheduled_posts_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_scheduled_post))
        .route("/", get(get_scheduled_posts))
        .route("/publish", post(publish_scheduled_posts))
        .route("/:id", get(get_scheduled_post))
        .route("/:id", put(update_scheduled_post))
        .route("/:id", delete(delete_scheduled_post))
}

// POST /api/scheduled-posts - Create a scheduled post
pub async fn create_scheduled_post(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateScheduledPostRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Validate required fields
    if payload.title.is_empty() || payload.content.is_empty() {
        return Err(AppError::BadRequest(
            "Title, content, and scheduled date are required".to_string(),
        ));
    }

    // Validate scheduled date is in the future
    if payload.scheduled_for <= chrono::Utc::now() {
        return Err(AppError::BadRequest(
            "Scheduled date must be in the future".to_string(),
        ));
    }

    // Create scheduled post
    let scheduled_post = sqlx::query_as!(
        ScheduledPostWithRelations,
        r#"
        INSERT INTO scheduled_posts (
            id, title, content, excerpt, cover_image, media_urls, 
            scheduled_for, is_public, minimum_tier_id, creator_id, 
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING 
            id, title, content, excerpt, cover_image, media_urls,
            scheduled_for, is_public, minimum_tier_id, creator_id,
            published, published_at, created_at, updated_at,
            NULL as creator_id, NULL as creator_name, NULL as creator_avatar,
            NULL as tier_id, NULL as tier_name, NULL as tier_price
        "#,
        Uuid::new_v4(),
        payload.title,
        payload.content,
        payload.excerpt,
        payload.cover_image,
        &payload.media_urls.unwrap_or_default(),
        payload.scheduled_for,
        payload.is_public.unwrap_or(true),
        payload.minimum_tier_id,
        user_id,
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Post scheduled successfully",
        "data": scheduled_post
    })))
}

// GET /api/scheduled-posts - Get all scheduled posts for creator
pub async fn get_scheduled_posts(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<GetScheduledPostsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let mut where_clause = "creator_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![Box::new(user_id)];
    let mut param_count = 1;

    if let Some(published) = query.published {
        param_count += 1;
        where_clause.push_str(&format!(" AND published = ${}", param_count));
        params.push(Box::new(published));
    }

    let scheduled_posts = sqlx::query_as!(
        ScheduledPostWithRelations,
        &format!(
            r#"
            SELECT 
                sp.id, sp.title, sp.content, sp.excerpt, sp.cover_image, sp.media_urls,
                sp.scheduled_for, sp.is_public, sp.minimum_tier_id, sp.creator_id,
                sp.published, sp.published_at, sp.created_at, sp.updated_at,
                u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
                mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
            FROM scheduled_posts sp
            LEFT JOIN users u ON sp.creator_id = u.id
            LEFT JOIN membership_tiers mt ON sp.minimum_tier_id = mt.id
            WHERE {}
            ORDER BY sp.scheduled_for ASC
            "#,
            where_clause
        )
    )
    .bind(&*params[0])
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": scheduled_posts
    })))
}

// POST /api/scheduled-posts/publish - Publish ready scheduled posts
pub async fn publish_scheduled_posts(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = chrono::Utc::now();

    // Find all scheduled posts that are ready to publish
    let ready_posts = sqlx::query_as!(
        ScheduledPostWithRelations,
        r#"
        SELECT 
            sp.id, sp.title, sp.content, sp.excerpt, sp.cover_image, sp.media_urls,
            sp.scheduled_for, sp.is_public, sp.minimum_tier_id, sp.creator_id,
            sp.published, sp.published_at, sp.created_at, sp.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
        FROM scheduled_posts sp
        LEFT JOIN users u ON sp.creator_id = u.id
        LEFT JOIN membership_tiers mt ON sp.minimum_tier_id = mt.id
        WHERE sp.published = false AND sp.scheduled_for <= $1
        "#,
        now
    )
    .fetch_all(&state.pool)
    .await?;

    let mut published_posts = Vec::new();

    for scheduled_post in ready_posts {
        // Create actual post
        let post = sqlx::query!(
            r#"
            INSERT INTO creator_posts (
                id, title, content, excerpt, images, type, is_public, 
                minimum_tier_id, author_id, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
            "#,
            Uuid::new_v4(),
            scheduled_post.title,
            scheduled_post.content,
            scheduled_post.excerpt,
            &if scheduled_post.cover_image.is_some() {
                vec![scheduled_post.cover_image.unwrap()]
            } else {
                vec![]
            },
            if scheduled_post.cover_image.is_some() { "IMAGE" } else { "TEXT" },
            scheduled_post.is_public,
            scheduled_post.minimum_tier_id,
            scheduled_post.creator_id,
            chrono::Utc::now(),
            chrono::Utc::now()
        )
        .fetch_one(&state.pool)
        .await?;

        // Mark scheduled post as published
        sqlx::query!(
            "UPDATE scheduled_posts SET published = true, published_at = $1 WHERE id = $2",
            now,
            scheduled_post.id
        )
        .execute(&state.pool)
        .await?;

        published_posts.push(post.id);
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("Published {} scheduled posts", published_posts.len()),
        "data": {
            "publishedCount": published_posts.len(),
            "posts": published_posts
        }
    })))
}

// GET /api/scheduled-posts/:id - Get a single scheduled post
pub async fn get_scheduled_post(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let scheduled_post = sqlx::query_as!(
        ScheduledPostWithRelations,
        r#"
        SELECT 
            sp.id, sp.title, sp.content, sp.excerpt, sp.cover_image, sp.media_urls,
            sp.scheduled_for, sp.is_public, sp.minimum_tier_id, sp.creator_id,
            sp.published, sp.published_at, sp.created_at, sp.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
        FROM scheduled_posts sp
        LEFT JOIN users u ON sp.creator_id = u.id
        LEFT JOIN membership_tiers mt ON sp.minimum_tier_id = mt.id
        WHERE sp.id = $1
        "#,
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let scheduled_post = scheduled_post.ok_or(AppError::NotFound("Scheduled post not found".to_string()))?;

    // Check ownership
    if scheduled_post.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "data": scheduled_post
    })))
}

// PUT /api/scheduled-posts/:id - Update a scheduled post
pub async fn update_scheduled_post(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateScheduledPostRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if scheduled post exists and user owns it
    let existing_post = sqlx::query!(
        "SELECT creator_id, published FROM scheduled_posts WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_post = existing_post.ok_or(AppError::NotFound("Scheduled post not found".to_string()))?;

    if existing_post.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    if existing_post.published {
        return Err(AppError::BadRequest(
            "Cannot update a published scheduled post".to_string(),
        ));
    }

    // Validate scheduled date if provided
    if let Some(scheduled_for) = payload.scheduled_for {
        if scheduled_for <= chrono::Utc::now() {
            return Err(AppError::BadRequest(
                "Scheduled date must be in the future".to_string(),
            ));
        }
    }

    // Build update query dynamically
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![];
    let mut param_count = 0;

    if let Some(title) = payload.title {
        param_count += 1;
        update_fields.push(format!("title = ${}", param_count));
        params.push(Box::new(title));
    }
    if let Some(content) = payload.content {
        param_count += 1;
        update_fields.push(format!("content = ${}", param_count));
        params.push(Box::new(content));
    }
    if let Some(excerpt) = payload.excerpt {
        param_count += 1;
        update_fields.push(format!("excerpt = ${}", param_count));
        params.push(Box::new(excerpt));
    }
    if let Some(cover_image) = payload.cover_image {
        param_count += 1;
        update_fields.push(format!("cover_image = ${}", param_count));
        params.push(Box::new(cover_image));
    }
    if let Some(media_urls) = payload.media_urls {
        param_count += 1;
        update_fields.push(format!("media_urls = ${}", param_count));
        params.push(Box::new(media_urls));
    }
    if let Some(scheduled_for) = payload.scheduled_for {
        param_count += 1;
        update_fields.push(format!("scheduled_for = ${}", param_count));
        params.push(Box::new(scheduled_for));
    }
    if let Some(is_public) = payload.is_public {
        param_count += 1;
        update_fields.push(format!("is_public = ${}", param_count));
        params.push(Box::new(is_public));
    }
    if let Some(minimum_tier_id) = payload.minimum_tier_id {
        param_count += 1;
        update_fields.push(format!("minimum_tier_id = ${}", param_count));
        params.push(Box::new(minimum_tier_id));
    }

    if update_fields.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    param_count += 1;
    update_fields.push(format!("updated_at = ${}", param_count));
    params.push(Box::new(chrono::Utc::now()));

    param_count += 1;
    params.push(Box::new(id));

    let query = format!(
        "UPDATE scheduled_posts SET {} WHERE id = ${}",
        update_fields.join(", "),
        param_count
    );

    sqlx::query(&query)
        .bind(&*params[0])
        .execute(&state.pool)
        .await?;

    // Fetch updated post
    let updated_post = sqlx::query_as!(
        ScheduledPostWithRelations,
        r#"
        SELECT 
            sp.id, sp.title, sp.content, sp.excerpt, sp.cover_image, sp.media_urls,
            sp.scheduled_for, sp.is_public, sp.minimum_tier_id, sp.creator_id,
            sp.published, sp.published_at, sp.created_at, sp.updated_at,
            u.id as creator_id, u.name as creator_name, u.avatar as creator_avatar,
            mt.id as tier_id, mt.name as tier_name, mt.price as tier_price
        FROM scheduled_posts sp
        LEFT JOIN users u ON sp.creator_id = u.id
        LEFT JOIN membership_tiers mt ON sp.minimum_tier_id = mt.id
        WHERE sp.id = $1
        "#,
        id
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Scheduled post updated",
        "data": updated_post
    })))
}

// DELETE /api/scheduled-posts/:id - Delete a scheduled post
pub async fn delete_scheduled_post(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if scheduled post exists and user owns it
    let existing_post = sqlx::query!(
        "SELECT creator_id FROM scheduled_posts WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_post = existing_post.ok_or(AppError::NotFound("Scheduled post not found".to_string()))?;

    if existing_post.creator_id != user_id {
        return Err(AppError::Forbidden("Forbidden".to_string()));
    }

    sqlx::query!("DELETE FROM scheduled_posts WHERE id = $1", id)
        .execute(&state.pool)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Scheduled post deleted"
    })))
}
