use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::{auth::Claims, database::Database, models::CreatePostRequest};

#[derive(Debug, Deserialize)]
pub struct PostQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub user_id: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct PostRecord {
    id: Uuid,
    user_id: String,
    title: String,
    content: Option<String>,
    media_url: Option<String>,
    media_type: Option<String>,
    image_urls: Option<Vec<String>>,
    video_url: Option<String>,
    audio_url: Option<String>,
    is_premium: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    author_name: Option<String>,
    author_username: Option<String>,
    author_avatar: Option<String>,
    author_is_creator: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreatorPostAuthor {
    id: String,
    name: Option<String>,
    username: Option<String>,
    avatar: Option<String>,
    #[serde(default)]
    is_creator: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreatorPostResponse {
    id: Uuid,
    title: String,
    content: String,
    excerpt: Option<String>,
    images: Vec<String>,
    video_url: Option<String>,
    audio_url: Option<String>,
    #[serde(default)]
    attachments: Option<serde_json::Value>,
    is_public: bool,
    #[serde(default)]
    minimum_tier_id: Option<String>,
    like_count: i64,
    comment_count: i64,
    published: bool,
    published_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    author: CreatorPostAuthor,
    has_access: bool,
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
    data: PostsData,
}

#[derive(Debug, Serialize)]
struct PostsData {
    posts: Vec<CreatorPostResponse>,
    pagination: PaginationInfo,
    #[serde(rename = "hasSubscription")]
    has_subscription: bool,
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

    let limit_i64 = limit as i64;
    let offset_i64 = offset as i64;

    let (posts, total) = if let Some(user_id) = params.user_id.clone() {
        let posts = sqlx::query_as::<_, PostRecord>(
            r#"
            SELECT 
                p.id,
                p.user_id,
                p.title,
                p.content,
                p.media_url,
                p.media_type,
                p.image_urls,
                p.video_url,
                p.audio_url,
                p.is_premium,
                p.created_at,
                p.updated_at,
                u.name as author_name,
                u.username as author_username,
                u.avatar as author_avatar,
                u.is_creator as author_is_creator
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&user_id)
        .bind(limit_i64)
        .bind(offset_i64)
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error fetching posts: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM posts WHERE user_id = $1")
            .bind(&user_id)
            .fetch_one(&db.pool)
            .await
            .map_err(|e| {
                eprintln!("Error counting posts: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        (posts, total as usize)
    } else {
        let posts = sqlx::query_as::<_, PostRecord>(
            r#"
            SELECT 
                p.id,
                p.user_id,
                p.title,
                p.content,
                p.media_url,
                p.media_type,
                p.image_urls,
                p.video_url,
                p.audio_url,
                p.is_premium,
                p.created_at,
                p.updated_at,
                u.name as author_name,
                u.username as author_username,
                u.avatar as author_avatar,
                u.is_creator as author_is_creator
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit_i64)
        .bind(offset_i64)
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error fetching posts: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        let total = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM posts")
            .fetch_one(&db.pool)
            .await
            .map_err(|e| {
                eprintln!("Error counting posts: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        (posts, total as usize)
    };

    let response = PostsResponse {
        success: true,
        data: PostsData {
            posts: posts.into_iter().map(map_post).collect(),
            pagination: PaginationInfo {
                page,
                limit,
                total,
                pages: calculate_total_pages(total, limit),
            },
            has_subscription: false,
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

    let posts = sqlx::query_as::<_, PostRecord>(
        r#"
        SELECT 
            p.id,
            p.user_id,
            p.title,
            p.content,
            p.media_url,
            p.media_type,
            p.image_urls,
            p.video_url,
            p.audio_url,
            p.is_premium,
            p.created_at,
            p.updated_at,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar,
            u.is_creator as author_is_creator
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
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

    let total_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM posts WHERE user_id = $1")
        .bind(&user_id)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error counting posts: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let response = PostsResponse {
        success: true,
        data: PostsData {
            posts: posts.into_iter().map(map_post).collect(),
            pagination: PaginationInfo {
                page,
                limit,
                total: total_count as usize,
                pages: calculate_total_pages(total_count as usize, limit),
            },
            has_subscription: false,
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
    let user_id = claims.sub;

    let posts = sqlx::query_as::<_, PostRecord>(
        r#"
        SELECT 
            p.id,
            p.user_id,
            p.title,
            p.content,
            p.media_url,
            p.media_type,
            p.image_urls,
            p.video_url,
            p.audio_url,
            p.is_premium,
            p.created_at,
            p.updated_at,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar,
            u.is_creator as author_is_creator
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&user_id)
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error fetching my posts: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM posts WHERE user_id = $1")
        .bind(&user_id)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error counting my posts: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let response = PostsResponse {
        success: true,
        data: PostsData {
            posts: posts.into_iter().map(map_post).collect(),
            pagination: PaginationInfo {
                page,
                limit,
                total: total_count as usize,
                pages: calculate_total_pages(total_count as usize, limit),
            },
            has_subscription: false,
        },
    };

    Ok(Json(response))
}

async fn create_post(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<CreatePostRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = claims.sub;

    let is_creator = sqlx::query_scalar::<_, bool>("SELECT is_creator FROM users WHERE id = $1")
        .bind(&user_id)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error checking creator status: {:?}", e);
            match e {
                sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            }
        })?;

    if !is_creator {
        return Err(StatusCode::FORBIDDEN);
    }

    let image_urls = sanitize_urls(payload.images.clone());
    let video_url = sanitize_url(payload.video_url.clone());
    let audio_url = sanitize_url(payload.audio_url.clone());
    let primary_media_url = sanitize_url(payload.media_url.clone());

    let media_url = primary_media_url
        .or_else(|| image_urls.as_ref().and_then(|imgs| imgs.first().cloned()))
        .or_else(|| video_url.clone())
        .or_else(|| audio_url.clone());

    let inferred_media_type = if video_url.is_some() {
        Some("video".to_string())
    } else if audio_url.is_some() {
        Some("audio".to_string())
    } else if image_urls
        .as_ref()
        .map(|imgs| !imgs.is_empty())
        .unwrap_or(false)
    {
        Some("image".to_string())
    } else {
        None
    };

    let media_type = payload
        .media_type
        .clone()
        .or_else(|| payload.content_type.clone())
        .or(inferred_media_type)
        .map(normalize_media_type);

    let is_public = payload.is_public.unwrap_or(true);
    let is_premium = payload.is_premium.unwrap_or(!is_public);

    let post_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO posts (user_id, title, content, media_url, media_type, is_premium, image_urls, video_url, audio_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        "#,
    )
    .bind(&user_id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(media_url.clone())
    .bind(media_type.clone())
    .bind(is_premium)
    .bind(image_urls.clone())
    .bind(video_url.clone())
    .bind(audio_url.clone())
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        eprintln!("Error creating post: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let post = fetch_post_with_author(&db, post_id).await?;

    Ok(Json(json!({
        "success": true,
        "data": map_post(post)
    })))
}

async fn get_post_by_id(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let post = fetch_post_with_author(&db, id).await?;

    Ok(Json(json!({
        "success": true,
        "data": map_post(post)
    })))
}

async fn update_post(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(payload): Json<CreatePostRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = claims.sub;

    let owns_post = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(&user_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !owns_post {
        return Err(StatusCode::FORBIDDEN);
    }

    let image_urls = sanitize_urls(payload.images.clone());
    let video_url = sanitize_url(payload.video_url.clone());
    let audio_url = sanitize_url(payload.audio_url.clone());
    let primary_media_url = sanitize_url(payload.media_url.clone());

    let media_url = primary_media_url
        .or_else(|| image_urls.as_ref().and_then(|imgs| imgs.first().cloned()))
        .or_else(|| video_url.clone())
        .or_else(|| audio_url.clone());

    let inferred_media_type = if video_url.is_some() {
        Some("video".to_string())
    } else if audio_url.is_some() {
        Some("audio".to_string())
    } else if image_urls
        .as_ref()
        .map(|imgs| !imgs.is_empty())
        .unwrap_or(false)
    {
        Some("image".to_string())
    } else {
        None
    };

    let media_type = payload
        .media_type
        .clone()
        .or_else(|| payload.content_type.clone())
        .or(inferred_media_type)
        .map(normalize_media_type);

    let is_public = payload.is_public.unwrap_or(true);
    let is_premium = payload.is_premium.unwrap_or(!is_public);

    let post_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        UPDATE posts 
        SET title = $2, content = $3, media_url = $4, media_type = $5, is_premium = $6, image_urls = $7, video_url = $8, audio_url = $9, updated_at = NOW()
        WHERE id = $1
        RETURNING id
        "#
    )
    .bind(id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(media_url.clone())
    .bind(media_type.clone())
    .bind(is_premium)
    .bind(image_urls.clone())
    .bind(video_url.clone())
    .bind(audio_url.clone())
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let post = fetch_post_with_author(&db, post_id).await?;

    Ok(Json(json!({
        "success": true,
        "data": map_post(post)
    })))
}

async fn delete_post(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = claims.sub;

    let owns_post = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND user_id = $2)",
    )
    .bind(id)
    .bind(&user_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !owns_post {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query("DELETE FROM posts WHERE id = $1")
        .bind(id)
        .execute(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({
        "success": true,
        "message": "Post deleted successfully"
    })))
}

fn calculate_total_pages(total: usize, limit: u32) -> u32 {
    if total == 0 || limit == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as u32
    }
}

fn normalize_media_type(media_type: String) -> String {
    let lowered = media_type.trim().to_ascii_lowercase();
    if lowered == "image" || lowered.starts_with("image/") {
        "image".to_string()
    } else if lowered == "video" || lowered.starts_with("video/") {
        "video".to_string()
    } else if lowered == "audio" || lowered.starts_with("audio/") {
        "audio".to_string()
    } else {
        lowered
    }
}

fn matches_media_type(media_type: Option<&str>, target: &str) -> bool {
    media_type
        .map(|mt| {
            let lowered = mt.trim().to_ascii_lowercase();
            if lowered == "mixed" {
                return matches!(target, "image" | "video" | "audio");
            }
            lowered == target || lowered.starts_with(&format!("{}/", target))
        })
        .unwrap_or(false)
}

fn sanitize_url(input: Option<String>) -> Option<String> {
    input.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn sanitize_urls(input: Option<Vec<String>>) -> Option<Vec<String>> {
    input
        .map(|values| {
            values
                .into_iter()
                .filter_map(|value| {
                    let trimmed = value.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                })
                .collect::<Vec<String>>()
        })
        .filter(|values| !values.is_empty())
}

fn map_post(record: PostRecord) -> CreatorPostResponse {
    let PostRecord {
        id,
        user_id,
        title,
        content,
        media_url,
        media_type,
        image_urls,
        video_url,
        audio_url,
        is_premium,
        created_at,
        updated_at,
        author_name,
        author_username,
        author_avatar,
        author_is_creator,
    } = record;

    let content = content.unwrap_or_default();
    let excerpt = generate_excerpt(&content);

    let mut images = image_urls.unwrap_or_default();
    if images.is_empty() && matches_media_type(media_type.as_deref(), "image") {
        if let Some(url) = media_url.clone() {
            images.push(url);
        }
    }

    let video_url = match (video_url, media_type.as_deref()) {
        (Some(url), _) => Some(url),
        (None, mt) if matches_media_type(mt, "video") => media_url.clone(),
        _ => None,
    };

    let audio_url = match (audio_url, media_type.as_deref()) {
        (Some(url), _) => Some(url),
        (None, mt) if matches_media_type(mt, "audio") => media_url.clone(),
        _ => None,
    };

    let author_display_name = author_name.clone().or_else(|| author_username.clone());

    CreatorPostResponse {
        id,
        title,
        content,
        excerpt,
        images,
        video_url,
        audio_url,
        attachments: None,
        is_public: !is_premium,
        minimum_tier_id: None,
        like_count: 0,
        comment_count: 0,
        published: true,
        published_at: Some(created_at),
        created_at,
        updated_at,
        author: CreatorPostAuthor {
            id: user_id,
            name: author_display_name,
            username: author_username,
            avatar: author_avatar,
            is_creator: author_is_creator.unwrap_or(false),
        },
        has_access: true,
    }
}

fn generate_excerpt(content: &str) -> Option<String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut excerpt: String = trimmed.chars().take(160).collect();
    if trimmed.chars().count() > 160 {
        excerpt.push_str("...");
    }
    Some(excerpt)
}

async fn fetch_post_with_author(db: &Database, post_id: Uuid) -> Result<PostRecord, StatusCode> {
    sqlx::query_as::<_, PostRecord>(
        r#"
        SELECT 
            p.id,
            p.user_id,
            p.title,
            p.content,
            p.media_url,
            p.media_type,
            p.image_urls,
            p.video_url,
            p.audio_url,
            p.is_premium,
            p.created_at,
            p.updated_at,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar,
            u.is_creator as author_is_creator
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
        "#,
    )
    .bind(post_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        if matches!(e, sqlx::Error::RowNotFound) {
            StatusCode::NOT_FOUND
        } else {
            eprintln!("Error fetching post with author: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })
}
