use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ScheduledPostCreateRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub is_public: bool,
    pub is_premium: bool,
    pub tags: Vec<String>,
    pub scheduled_for: DateTime<Utc>,
    pub creator_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ScheduledPostUpdateRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub images: Option<Vec<String>>,
    pub video_url: Option<Option<String>>,
    pub is_public: Option<bool>,
    pub is_premium: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub scheduled_for: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct ScheduledPostResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub is_public: bool,
    pub is_premium: bool,
    pub tags: Vec<String>,
    pub scheduled_for: DateTime<Utc>,
    pub status: String,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PublishResult {
    pub published_count: i32,
    pub failed_count: i32,
    pub published_posts: Vec<Uuid>,
}

pub async fn create_scheduled_post(
    state: &SharedState,
    input: ScheduledPostCreateRequest,
) -> Result<ScheduledPostResponse, AppError> {
    let post_id = Uuid::new_v4();
    
    let post = sqlx::query!(
        r#"
        INSERT INTO scheduled_posts (
            id, title, content, excerpt, images, video_url,
            is_public, is_premium, tags, scheduled_for, status,
            creator_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SCHEDULED', $11, NOW(), NOW())
        RETURNING *
        "#,
        post_id,
        input.title,
        input.content,
        input.excerpt,
        &input.images,
        input.video_url,
        input.is_public,
        input.is_premium,
        &input.tags,
        input.scheduled_for,
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(ScheduledPostResponse {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        images: post.images,
        video_url: post.video_url,
        is_public: post.is_public,
        is_premium: post.is_premium,
        tags: post.tags,
        scheduled_for: post.scheduled_for,
        status: post.status,
        creator_id: post.creator_id,
        created_at: post.created_at,
        updated_at: post.updated_at,
    })
}

pub async fn get_scheduled_posts(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    status: Option<String>,
) -> Result<Vec<ScheduledPostResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "creator_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(status_filter) = status {
        where_clause.push_str(&format!(" AND status = ${}", param_count + 1));
        params.push(Box::new(status_filter));
        param_count += 1;
    }

    let query_str = format!(
        r#"
        SELECT * FROM scheduled_posts
        WHERE {}
        ORDER BY scheduled_for ASC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(vec![])
}

pub async fn get_scheduled_post(
    state: &SharedState,
    creator_id: Uuid,
    post_id: Uuid,
) -> Result<ScheduledPostResponse, AppError> {
    let post = sqlx::query!(
        "SELECT * FROM scheduled_posts WHERE id = $1 AND creator_id = $2",
        post_id,
        creator_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let post = match post {
        Some(p) => p,
        None => return Err(AppError::NotFound("Scheduled post not found".to_string())),
    };

    Ok(ScheduledPostResponse {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        images: post.images,
        video_url: post.video_url,
        is_public: post.is_public,
        is_premium: post.is_premium,
        tags: post.tags,
        scheduled_for: post.scheduled_for,
        status: post.status,
        creator_id: post.creator_id,
        created_at: post.created_at,
        updated_at: post.updated_at,
    })
}

pub async fn update_scheduled_post(
    state: &SharedState,
    creator_id: Uuid,
    post_id: Uuid,
    input: ScheduledPostUpdateRequest,
) -> Result<ScheduledPostResponse, AppError> {
    // Check if post exists and user owns it
    let post = sqlx::query!(
        "SELECT creator_id FROM scheduled_posts WHERE id = $1",
        post_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let post = match post {
        Some(p) => p,
        None => return Err(AppError::NotFound("Scheduled post not found".to_string())),
    };

    if post.creator_id != creator_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    // Build dynamic update query
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(title) = input.title {
        update_fields.push(format!("title = ${}", param_count));
        params.push(Box::new(title));
        param_count += 1;
    }

    if let Some(content) = input.content {
        update_fields.push(format!("content = ${}", param_count));
        params.push(Box::new(content));
        param_count += 1;
    }

    if let Some(excerpt) = input.excerpt {
        update_fields.push(format!("excerpt = ${}", param_count));
        params.push(Box::new(excerpt));
        param_count += 1;
    }

    if let Some(images) = input.images {
        update_fields.push(format!("images = ${}", param_count));
        params.push(Box::new(images));
        param_count += 1;
    }

    if let Some(video_url) = input.video_url {
        update_fields.push(format!("video_url = ${}", param_count));
        params.push(Box::new(video_url));
        param_count += 1;
    }

    if let Some(is_public) = input.is_public {
        update_fields.push(format!("is_public = ${}", param_count));
        params.push(Box::new(is_public));
        param_count += 1;
    }

    if let Some(is_premium) = input.is_premium {
        update_fields.push(format!("is_premium = ${}", param_count));
        params.push(Box::new(is_premium));
        param_count += 1;
    }

    if let Some(tags) = input.tags {
        update_fields.push(format!("tags = ${}", param_count));
        params.push(Box::new(tags));
        param_count += 1;
    }

    if let Some(scheduled_for) = input.scheduled_for {
        update_fields.push(format!("scheduled_for = ${}", param_count));
        params.push(Box::new(scheduled_for));
        param_count += 1;
    }

    if update_fields.is_empty() {
        return get_scheduled_post(state, creator_id, post_id).await;
    }

    update_fields.push("updated_at = NOW()".to_string());
    update_fields.push(format!("id = ${}", param_count));
    params.push(Box::new(post_id));

    // For now, return the existing post (TODO: implement dynamic query)
    get_scheduled_post(state, creator_id, post_id).await
}

pub async fn delete_scheduled_post(
    state: &SharedState,
    creator_id: Uuid,
    post_id: Uuid,
) -> Result<(), AppError> {
    let post = sqlx::query!(
        "SELECT creator_id FROM scheduled_posts WHERE id = $1",
        post_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let post = match post {
        Some(p) => p,
        None => return Err(AppError::NotFound("Scheduled post not found".to_string())),
    };

    if post.creator_id != creator_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!("DELETE FROM scheduled_posts WHERE id = $1", post_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}

pub async fn publish_scheduled_posts(
    state: &SharedState,
) -> Result<PublishResult, AppError> {
    let now = Utc::now();
    
    // Get posts ready to publish
    let posts = sqlx::query!(
        r#"
        SELECT * FROM scheduled_posts
        WHERE status = 'SCHEDULED' AND scheduled_for <= $1
        ORDER BY scheduled_for ASC
        "#,
        now
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut published_count = 0;
    let mut failed_count = 0;
    let mut published_posts = Vec::new();

    for post in posts {
        // Create creator post
        let creator_post_id = Uuid::new_v4();
        
        match sqlx::query!(
            r#"
            INSERT INTO creator_posts (
                id, title, content, excerpt, images, video_url,
                is_public, is_premium, tags, author_id, published,
                published_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, NOW(), NOW())
            "#,
            creator_post_id,
            post.title,
            post.content,
            post.excerpt,
            post.images,
            post.video_url,
            post.is_public,
            post.is_premium,
            post.tags,
            post.creator_id,
            now
        )
        .execute(&state.db_pool)
        .await
        {
            Ok(_) => {
                // Update scheduled post status
                sqlx::query!(
                    "UPDATE scheduled_posts SET status = 'PUBLISHED' WHERE id = $1",
                    post.id
                )
                .execute(&state.db_pool)
                .await?;

                published_count += 1;
                published_posts.push(creator_post_id);
            }
            Err(_) => {
                failed_count += 1;
            }
        }
    }

    Ok(PublishResult {
        published_count,
        failed_count,
        published_posts,
    })
}
