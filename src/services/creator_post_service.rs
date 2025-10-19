use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreatorPostCreateRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub is_public: bool,
    pub is_premium: bool,
    pub tags: Vec<String>,
    pub author_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreatorPostUpdateRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub images: Option<Vec<String>>,
    pub video_url: Option<Option<String>>,
    pub is_public: Option<bool>,
    pub is_premium: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub published: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct CreatorPostResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Vec<String>,
    pub video_url: Option<String>,
    pub is_public: bool,
    pub is_premium: bool,
    pub tags: Vec<String>,
    pub author_id: Uuid,
    pub published: bool,
    pub like_count: i32,
    pub comment_count: i32,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author: CreatorPostAuthor,
}

#[derive(Debug, Serialize)]
pub struct CreatorPostAuthor {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

pub async fn create_creator_post(
    state: &SharedState,
    input: CreatorPostCreateRequest,
) -> Result<CreatorPostResponse, AppError> {
    let post_id = Uuid::new_v4();
    
    let post = sqlx::query!(
        r#"
        INSERT INTO creator_posts (
            id, title, content, excerpt, images, video_url, 
            is_public, is_premium, tags, author_id, published, 
            like_count, comment_count, published_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 0, $12, NOW(), NOW())
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
        input.author_id,
        input.is_public, // Auto-publish if public
        if input.is_public { Some(Utc::now()) } else { None }
    )
    .fetch_one(&state.db_pool)
    .await?;

    let author = sqlx::query!(
        "SELECT id, name, username, avatar FROM users WHERE id = $1",
        input.author_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(CreatorPostResponse {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        images: post.images,
        video_url: post.video_url,
        is_public: post.is_public,
        is_premium: post.is_premium,
        tags: post.tags,
        author_id: post.author_id,
        published: post.published,
        like_count: post.like_count,
        comment_count: post.comment_count,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: CreatorPostAuthor {
            id: author.id,
            name: author.name,
            username: author.username,
            avatar: author.avatar,
        },
    })
}

pub async fn get_my_posts(
    state: &SharedState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<CreatorPostResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let posts = sqlx::query!(
        r#"
        SELECT 
            cp.*,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar
        FROM creator_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE cp.author_id = $1
        ORDER BY cp.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for post in posts {
        result.push(CreatorPostResponse {
            id: post.id,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            images: post.images,
            video_url: post.video_url,
            is_public: post.is_public,
            is_premium: post.is_premium,
            tags: post.tags,
            author_id: post.author_id,
            published: post.published,
            like_count: post.like_count,
            comment_count: post.comment_count,
            published_at: post.published_at,
            created_at: post.created_at,
            updated_at: post.updated_at,
            author: CreatorPostAuthor {
                id: post.author_id,
                name: post.author_name,
                username: post.author_username,
                avatar: post.author_avatar,
            },
        });
    }

    Ok(result)
}

pub async fn get_creator_posts(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    is_public: Option<bool>,
    is_premium: Option<bool>,
) -> Result<Vec<CreatorPostResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "cp.author_id = $1 AND cp.published = true".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(public) = is_public {
        where_clause.push_str(&format!(" AND cp.is_public = ${}", param_count + 1));
        params.push(Box::new(public));
        param_count += 1;
    }

    if let Some(premium) = is_premium {
        where_clause.push_str(&format!(" AND cp.is_premium = ${}", param_count + 1));
        params.push(Box::new(premium));
        param_count += 1;
    }

    let query_str = format!(
        r#"
        SELECT 
            cp.*,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar
        FROM creator_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE {}
        ORDER BY cp.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(vec![])
}

pub async fn get_creator_post(
    state: &SharedState,
    post_id: Uuid,
) -> Result<CreatorPostResponse, AppError> {
    let post = sqlx::query!(
        r#"
        SELECT 
            cp.*,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar
        FROM creator_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE cp.id = $1
        "#,
        post_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let post = match post {
        Some(p) => p,
        None => return Err(AppError::NotFound("Post not found".to_string())),
    };

    Ok(CreatorPostResponse {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        images: post.images,
        video_url: post.video_url,
        is_public: post.is_public,
        is_premium: post.is_premium,
        tags: post.tags,
        author_id: post.author_id,
        published: post.published,
        like_count: post.like_count,
        comment_count: post.comment_count,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: CreatorPostAuthor {
            id: post.author_id,
            name: post.author_name,
            username: post.author_username,
            avatar: post.author_avatar,
        },
    })
}

pub async fn update_creator_post(
    state: &SharedState,
    user_id: Uuid,
    post_id: Uuid,
    input: CreatorPostUpdateRequest,
) -> Result<CreatorPostResponse, AppError> {
    // Check if post exists and user owns it
    let post = sqlx::query!(
        "SELECT author_id FROM creator_posts WHERE id = $1",
        post_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let post = match post {
        Some(p) => p,
        None => return Err(AppError::NotFound("Post not found".to_string())),
    };

    if post.author_id != user_id {
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

    if let Some(published) = input.published {
        update_fields.push(format!("published = ${}", param_count));
        params.push(Box::new(published));
        param_count += 1;
        
        if published {
            update_fields.push("published_at = NOW()".to_string());
        }
    }

    if update_fields.is_empty() {
        return get_creator_post(state, post_id).await;
    }

    update_fields.push("updated_at = NOW()".to_string());
    update_fields.push(format!("id = ${}", param_count));
    params.push(Box::new(post_id));

    // For now, return the existing post (TODO: implement dynamic query)
    get_creator_post(state, post_id).await
}

pub async fn delete_creator_post(
    state: &SharedState,
    user_id: Uuid,
    post_id: Uuid,
) -> Result<(), AppError> {
    let post = sqlx::query!(
        "SELECT author_id FROM creator_posts WHERE id = $1",
        post_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let post = match post {
        Some(p) => p,
        None => return Err(AppError::NotFound("Post not found".to_string())),
    };

    if post.author_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!("DELETE FROM creator_posts WHERE id = $1", post_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}
