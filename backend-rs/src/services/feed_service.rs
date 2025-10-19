use crate::error::AppError;
use crate::state::SharedState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
pub struct FeedFilters {
    pub limit: u32,
    pub cursor: Option<String>,
    pub r#type: Option<String>,
    pub sort: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FeedResponse {
    pub items: Vec<FeedItem>,
    pub highlights: Vec<FeedItem>,
    pub recommended_content: Vec<FeedItem>,
    pub recommended_creators: Vec<RecommendedCreator>,
    pub filters: FeedFilters,
    pub summary: FeedSummary,
    pub next_cursor: Option<String>,
    pub has_more: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct FeedItem {
    pub id: String,
    pub source_id: String,
    pub r#type: String,
    pub title: String,
    pub summary: Option<String>,
    pub preview: Option<String>,
    pub cover_image: Option<String>,
    pub published_at: chrono::DateTime<chrono::Utc>,
    pub link: String,
    pub creator: FeedCreator,
    pub popularity_score: i32,
    pub is_highlight: bool,
    pub is_new: bool,
    pub is_saved: bool,
    pub badges: Vec<String>,
    pub meta: FeedMeta,
}

#[derive(Debug, Serialize, Clone)]
pub struct FeedCreator {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub slug: String,
    pub follower_count: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct FeedMeta {
    pub likes: Option<i32>,
    pub comments: Option<i32>,
    pub rsvps: Option<i32>,
    pub read_time: Option<i32>,
    pub visibility: Option<String>,
    pub period_start: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub location: Option<String>,
    pub price: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct RecommendedCreator {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub creator_bio: Option<String>,
    pub follower_count: i64,
    pub is_followed: bool,
    pub slug: String,
}

#[derive(Debug, Serialize)]
pub struct FeedSummary {
    pub total_items: usize,
    pub highlight_count: usize,
    pub recommendations_count: usize,
}

pub async fn get_feed(
    state: &SharedState,
    user_id: Uuid,
    filters: FeedFilters,
) -> Result<FeedResponse, AppError> {
    // Get user's following list
    let follows = sqlx::query!(
        "SELECT following_id FROM follows WHERE follower_id = $1",
        user_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    let following_ids: Vec<Uuid> = follows.into_iter().map(|f| f.following_id).collect();

    if following_ids.is_empty() {
        return Ok(FeedResponse {
            items: vec![],
            highlights: vec![],
            recommended_content: vec![],
            recommended_creators: vec![],
            filters,
            summary: FeedSummary {
                total_items: 0,
                highlight_count: 0,
                recommendations_count: 0,
            },
            next_cursor: None,
            has_more: false,
        });
    }

    // Get feed items from followed creators
    let posts = sqlx::query!(
        r#"
        SELECT 
            cp.id,
            cp.title,
            cp.excerpt,
            cp.content,
            cp.images,
            cp.published_at,
            cp.created_at,
            cp.is_public,
            cp.like_count,
            cp.comment_count,
            u.id as author_id,
            u.name as author_name,
            u.username as author_username,
            u.avatar as author_avatar
        FROM creator_posts cp
        JOIN users u ON cp.author_id = u.id
        WHERE cp.author_id = ANY($1) AND cp.published = true
        ORDER BY cp.published_at DESC
        LIMIT $2
        "#,
        &following_ids,
        filters.limit as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut items = Vec::new();
    for post in posts {
        let slug = create_slug(post.author_username.as_deref(), Some(&post.author_name));
        let likes = post.like_count.unwrap_or(0);
        let comments = post.comment_count.unwrap_or(0);
        let popularity_score = likes * 3 + comments * 4;

        let item = FeedItem {
            id: format!("post_{}", post.id),
            source_id: post.id.to_string(),
            r#type: "post".to_string(),
            title: post.title,
            summary: post.excerpt,
            preview: Some(truncate_content(&post.content, 260)),
            cover_image: post.images.and_then(|imgs| imgs.first().cloned()),
            published_at: post.published_at.unwrap_or(post.created_at),
            link: format!("/creators/{}?tab=posts&post={}", slug, post.id),
            creator: FeedCreator {
                id: post.author_id,
                name: post.author_name,
                username: post.author_username,
                avatar: post.author_avatar,
                slug,
                follower_count: 0, // TODO: Get actual follower count
            },
            popularity_score,
            is_highlight: popularity_score >= 12,
            is_new: false, // TODO: Calculate based on recent window
            is_saved: false, // TODO: Check bookmark status
            badges: vec![],
            meta: FeedMeta {
                likes: Some(likes),
                comments: Some(comments),
                rsvps: None,
                read_time: None,
                visibility: Some(if post.is_public { "public".to_string() } else { "supporters".to_string() }),
                period_start: None,
                start_time: None,
                end_time: None,
                location: None,
                price: None,
            },
        };

        items.push(item);
    }

    // TODO: Add articles and events
    // TODO: Calculate highlights
    // TODO: Add recommended content
    // TODO: Add recommended creators

    Ok(FeedResponse {
        items: items.clone(),
        highlights: vec![],
        recommended_content: vec![],
        recommended_creators: vec![],
        filters,
        summary: FeedSummary {
            total_items: items.len(),
            highlight_count: 0,
            recommendations_count: 0,
        },
        next_cursor: None,
        has_more: false,
    })
}

pub async fn list_bookmarks(
    state: &SharedState,
    user_id: Uuid,
) -> Result<Vec<serde_json::Value>, AppError> {
    let bookmarks = sqlx::query!(
        r#"
        SELECT content_type, content_id, created_at
        FROM feed_bookmarks
        WHERE user_id = $1
        ORDER BY created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for bookmark in bookmarks {
        result.push(serde_json::json!({
            "content_type": bookmark.content_type,
            "content_id": bookmark.content_id,
            "created_at": bookmark.created_at
        }));
    }

    Ok(result)
}

pub async fn add_bookmark(
    state: &SharedState,
    user_id: Uuid,
    content_type: String,
    content_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        r#"
        INSERT INTO feed_bookmarks (id, user_id, content_type, content_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id, content_type, content_id) DO NOTHING
        "#,
        uuid::Uuid::new_v4(),
        user_id,
        content_type,
        content_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn remove_bookmark(
    state: &SharedState,
    user_id: Uuid,
    content_type: String,
    content_id: Uuid,
) -> Result<(), AppError> {
    sqlx::query!(
        "DELETE FROM feed_bookmarks WHERE user_id = $1 AND content_type = $2 AND content_id = $3",
        user_id,
        content_type,
        content_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

fn create_slug(username: Option<&str>, name: Option<&str>) -> String {
    if let Some(username) = username {
        return username.to_string();
    }
    
    if let Some(name) = name {
        return name
            .to_lowercase()
            .trim()
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "-")
            .replace("-+", "-");
    }
    
    String::new()
}

fn truncate_content(content: &str, limit: usize) -> String {
    if content.len() <= limit {
        return content.to_string();
    }
    
    format!("{}…", &content[..limit - 1])
}
