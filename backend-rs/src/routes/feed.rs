use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post},
    Router,
};
use serde::Deserialize;

use crate::{
    auth::AuthUser,
    error::AppError,
    models::{
        feed::{
            CreateBookmarkRequest, FeedBookmark, FeedResponse, RemoveBookmarkRequest,
        },
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct GetFeedQuery {
    pub limit: Option<i32>,
    pub cursor: Option<String>,
    pub r#type: Option<String>,
    pub sort: Option<String>,
    pub period: Option<String>,
}

pub fn feed_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_feed))
        .route("/bookmarks", get(list_bookmarks))
        .route("/bookmarks", post(add_bookmark))
        .route("/bookmarks", delete(remove_bookmark))
}

// GET /api/feed - Get user's personalized feed
pub async fn get_feed(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<GetFeedQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Get user's following list
    let follows = sqlx::query!(
        "SELECT following_id FROM follows WHERE follower_id = $1",
        user_id
    )
    .fetch_all(&state.pool)
    .await?;

    let following_ids: Vec<uuid::Uuid> = follows.into_iter().map(|f| f.following_id).collect();

    if following_ids.is_empty() {
        return Ok(Json(serde_json::json!({
            "success": true,
            "data": {
                "items": [],
                "highlights": [],
                "recommended_content": [],
                "recommended_creators": [],
                "filters": {
                    "filter": query.r#type.unwrap_or_else(|| "all".to_string()),
                    "sort": query.sort.unwrap_or_else(|| "recent".to_string()),
                    "period": query.period.and_then(|p| p.parse::<i32>().ok())
                },
                "summary": {
                    "total_items": 0,
                    "highlight_count": 0,
                    "recommendations_count": 0
                },
                "next_cursor": null,
                "has_more": false
            }
        })));
    }

    // Get active subscriptions
    let subscriptions = sqlx::query!(
        "SELECT creator_id, tier_id FROM subscriptions WHERE subscriber_id = $1 AND creator_id = ANY($2) AND status = 'ACTIVE'",
        user_id,
        &following_ids
    )
    .fetch_all(&state.pool)
    .await?;

    let subscribed_creator_ids: std::collections::HashSet<uuid::Uuid> = subscriptions
        .into_iter()
        .map(|s| s.creator_id)
        .collect();

    // Get posts from followed creators
    let posts = sqlx::query!(
        r#"
        SELECT 
            cp.id, cp.title, cp.excerpt, cp.content, cp.images, cp.is_public, 
            cp.published_at, cp.created_at, cp.like_count, cp.comment_count,
            u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar
        FROM creator_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE cp.author_id = ANY($1) AND cp.published = true
        ORDER BY cp.published_at DESC
        LIMIT 20
        "#,
        &following_ids
    )
    .fetch_all(&state.pool)
    .await?;

    // Get articles from followed creators
    let articles = sqlx::query!(
        r#"
        SELECT 
            a.id, a.title, a.excerpt, a.content, a.cover_image, a.is_premium, 
            a.published_at, a.created_at, a.read_time,
            u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar
        FROM articles a
        JOIN users u ON a.author_id = u.id
        WHERE a.author_id = ANY($1) AND a.status = 'PUBLISHED'
        ORDER BY a.published_at DESC
        LIMIT 20
        "#,
        &following_ids
    )
    .fetch_all(&state.pool)
    .await?;

    // Get events from followed creators
    let events = sqlx::query!(
        r#"
        SELECT 
            e.id, e.title, e.description, e.cover_image, e.is_public, 
            e.start_time, e.end_time, e.location, e.price, e.created_at,
            u.id as host_id, u.name as host_name, u.username as host_username, u.avatar as host_avatar
        FROM events e
        JOIN users u ON e.host_id = u.id
        WHERE e.host_id = ANY($1) AND e.status = 'PUBLISHED'
        ORDER BY e.created_at DESC
        LIMIT 20
        "#,
        &following_ids
    )
    .fetch_all(&state.pool)
    .await?;

    // Build feed items
    let mut items = Vec::new();

    // Add posts
    for post in posts {
        let slug = post.author_username.as_deref().unwrap_or("").to_string();
        let has_access = post.is_public || subscribed_creator_ids.contains(&post.author_id) || post.author_id == user_id;
        
        let feed_item = serde_json::json!({
            "id": format!("post_{}", post.id),
            "source_id": post.id,
            "type": "post",
            "title": post.title,
            "summary": post.excerpt,
            "preview": if has_access { post.content } else { post.excerpt },
            "cover_image": post.images.and_then(|i| i.first().cloned()),
            "published_at": post.published_at.unwrap_or(post.created_at),
            "link": format!("/creators/{}?tab=posts&post={}", slug, post.id),
            "creator": {
                "id": post.author_id,
                "name": post.author_name,
                "username": post.author_username,
                "avatar": post.author_avatar,
                "slug": slug
            },
            "popularity_score": (post.like_count.unwrap_or(0) * 3) + (post.comment_count.unwrap_or(0) * 4),
            "is_highlight": false,
            "is_new": false,
            "is_saved": false,
            "badges": vec![],
            "meta": {
                "likes": post.like_count,
                "comments": post.comment_count,
                "visibility": if post.is_public { "public" } else { "supporters" }
            }
        });
        
        items.push(feed_item);
    }

    // Add articles
    for article in articles {
        let slug = article.author_username.as_deref().unwrap_or("").to_string();
        
        let feed_item = serde_json::json!({
            "id": format!("article_{}", article.id),
            "source_id": article.id,
            "type": "article",
            "title": article.title,
            "summary": article.excerpt,
            "preview": article.content,
            "cover_image": article.cover_image,
            "published_at": article.published_at.unwrap_or(article.created_at),
            "link": format!("/blog/{}", slug),
            "creator": {
                "id": article.author_id,
                "name": article.author_name,
                "username": article.author_username,
                "avatar": article.author_avatar,
                "slug": slug
            },
            "popularity_score": 0,
            "is_highlight": false,
            "is_new": false,
            "is_saved": false,
            "badges": vec![],
            "meta": {
                "read_time": article.read_time,
                "visibility": if article.is_premium { "supporters" } else { "public" }
            }
        });
        
        items.push(feed_item);
    }

    // Add events
    for event in events {
        let slug = event.host_username.as_deref().unwrap_or("").to_string();
        
        let feed_item = serde_json::json!({
            "id": format!("event_{}", event.id),
            "source_id": event.id,
            "type": "event",
            "title": event.title,
            "summary": event.description,
            "preview": event.description,
            "cover_image": event.cover_image,
            "published_at": event.created_at,
            "link": format!("/events/{}", event.id),
            "creator": {
                "id": event.host_id,
                "name": event.host_name,
                "username": event.host_username,
                "avatar": event.host_avatar,
                "slug": slug
            },
            "popularity_score": 0,
            "is_highlight": false,
            "is_new": false,
            "is_saved": false,
            "badges": vec![],
            "meta": {
                "visibility": if event.is_public { "public" } else { "supporters" },
                "start_time": event.start_time.to_rfc3339(),
                "end_time": event.end_time.map(|e| e.to_rfc3339()),
                "location": event.location,
                "price": event.price
            }
        });
        
        items.push(feed_item);
    }

    // Sort items by published_at
    items.sort_by(|a, b| {
        let a_time = a["published_at"].as_str().unwrap_or("");
        let b_time = b["published_at"].as_str().unwrap_or("");
        b_time.cmp(a_time)
    });

    // Apply limit
    let limit = query.limit.unwrap_or(20).min(50);
    let limited_items = items.into_iter().take(limit as usize).collect::<Vec<_>>();

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "items": limited_items,
            "highlights": [],
            "recommended_content": [],
            "recommended_creators": [],
            "filters": {
                "filter": query.r#type.unwrap_or_else(|| "all".to_string()),
                "sort": query.sort.unwrap_or_else(|| "recent".to_string()),
                "period": query.period.and_then(|p| p.parse::<i32>().ok())
            },
            "summary": {
                "total_items": limited_items.len(),
                "highlight_count": 0,
                "recommendations_count": 0
            },
            "next_cursor": null,
            "has_more": false
        }
    })))
}

// GET /api/feed/bookmarks - List user's bookmarks
pub async fn list_bookmarks(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let bookmarks = sqlx::query_as!(
        FeedBookmark,
        "SELECT id, user_id, content_type, content_id, created_at FROM feed_bookmarks WHERE user_id = $1 ORDER BY created_at DESC",
        user_id
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": bookmarks
    })))
}

// POST /api/feed/bookmarks - Add bookmark
pub async fn add_bookmark(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateBookmarkRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if bookmark already exists
    let existing = sqlx::query!(
        "SELECT id FROM feed_bookmarks WHERE user_id = $1 AND content_type = $2 AND content_id = $3",
        user_id,
        payload.content_type,
        payload.content_id
    )
    .fetch_optional(&state.pool)
    .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Bookmark already exists".to_string()));
    }

    let bookmark = sqlx::query_as!(
        FeedBookmark,
        r#"
        INSERT INTO feed_bookmarks (id, user_id, content_type, content_id, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, content_type, content_id, created_at
        "#,
        uuid::Uuid::new_v4(),
        user_id,
        payload.content_type,
        payload.content_id,
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": bookmark
    })))
}

// DELETE /api/feed/bookmarks - Remove bookmark
pub async fn remove_bookmark(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<RemoveBookmarkRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let result = sqlx::query!(
        "DELETE FROM feed_bookmarks WHERE user_id = $1 AND content_type = $2 AND content_id = $3",
        user_id,
        payload.content_type,
        payload.content_id
    )
    .execute(&state.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Bookmark not found".to_string()));
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Bookmark removed"
    })))
}
