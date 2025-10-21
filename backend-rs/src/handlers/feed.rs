use axum::extract::{Query, State};
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

#[derive(Debug, Deserialize)]
pub struct FeedQuery {
    pub limit: Option<i32>,
    pub page: Option<i32>,
    #[serde(rename = "type")]
    pub filter: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct FeedItem {
    pub id: String,
    #[serde(rename = "sourceId")]
    pub source_id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub title: String,
    pub summary: Option<String>,
    pub preview: Option<String>,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "publishedAt")]
    pub published_at: String,
    pub link: String,
    pub creator: FeedCreator,
    #[serde(rename = "popularityScore")]
    pub popularity_score: i32,
    #[serde(rename = "isHighlight")]
    pub is_highlight: bool,
    #[serde(rename = "isNew")]
    pub is_new: bool,
    #[serde(rename = "isSaved")]
    pub is_saved: bool,
    pub badges: Vec<String>,
    pub meta: FeedMeta,
}

#[derive(Debug, Serialize, Clone)]
pub struct FeedCreator {
    pub id: String,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
    pub slug: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct FeedMeta {
    pub likes: Option<i64>,
    pub comments: Option<i64>,
    pub rsvps: Option<i64>,
    pub visibility: String,
}

#[derive(Debug, Serialize)]
pub struct FeedResponse {
    pub items: Vec<FeedItem>,
    pub highlights: Vec<FeedItem>,
    pub pagination: FeedPagination,
}

#[derive(Debug, Serialize)]
pub struct FeedPagination {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

fn format_datetime(value: NaiveDateTime) -> String {
    DateTime::<Utc>::from_naive_utc_and_offset(value, Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn to_slug(username: Option<&str>, name: &str) -> String {
    username.map(|u| u.to_string()).unwrap_or_else(|| {
        name.to_lowercase()
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "-")
            .replace("--", "-")
            .trim_matches('-')
            .to_string()
    })
}

pub async fn get_feed(
    State(state): State<AppState>,
    Query(params): Query<FeedQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let page = params.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    // Fetch public posts
    #[derive(Debug, FromRow)]
    struct PostRow {
        id: String,
        title: String,
        excerpt: String,
        content: String,
        images: Option<Vec<String>>,
        is_public: bool,
        published_at: Option<NaiveDateTime>,
        author_id: String,
        author_name: String,
        author_username: Option<String>,
        author_avatar: Option<String>,
        like_count: i64,
        comment_count: i64,
    }

    // Fetch posts, articles, and events in parallel
    #[derive(Debug, FromRow)]
    struct ArticleRow {
        id: String,
        slug: String,
        title: String,
        excerpt: String,
        content: String,
        cover_image: Option<String>,
        read_time: Option<i32>,
        is_public: bool,
        published_at: Option<NaiveDateTime>,
        author_id: String,
        author_name: String,
        author_username: Option<String>,
        author_avatar: Option<String>,
        like_count: i64,
        comment_count: i64,
    }

    #[derive(Debug, FromRow)]
    struct EventRow {
        id: String,
        title: String,
        description: String,
        cover_image: Option<String>,
        start_time: NaiveDateTime,
        end_time: Option<NaiveDateTime>,
        location: Option<String>,
        price: Option<i32>,
        is_public: bool,
        created_at: NaiveDateTime,
        host_id: String,
        host_name: String,
        host_username: Option<String>,
        host_avatar: Option<String>,
        rsvp_count: i64,
    }

    let (posts, articles, events): (Vec<PostRow>, Vec<ArticleRow>, Vec<EventRow>) = tokio::try_join!(
        sqlx::query_as::<_, PostRow>(
            r#"
            SELECT
                p.id,
                p.title,
                COALESCE(p.excerpt, '') AS excerpt,
                COALESCE(p.content, '') AS content,
                p.images,
                COALESCE(p."isPublic", TRUE) AS is_public,
                p."publishedAt" AS published_at,
                u.id AS author_id,
                u.name AS author_name,
                u.username AS author_username,
                u.avatar AS author_avatar,
                COALESCE(p."likeCount", 0)::BIGINT AS like_count,
                COALESCE(p."commentCount", 0)::BIGINT AS comment_count
            FROM "CreatorPost" p
            LEFT JOIN "User" u ON u.id = p."authorId"
            WHERE p.published = TRUE
            ORDER BY COALESCE(p."publishedAt", p."createdAt") DESC
            LIMIT $1
            "#
        )
        .bind(limit * 2)
        .fetch_all(&state.db),

        sqlx::query_as::<_, ArticleRow>(
            r#"
            SELECT
                a.id,
                a.slug,
                a.title,
                COALESCE(a.excerpt, '') AS excerpt,
                COALESCE(a.content, '') AS content,
                a."coverImage" AS cover_image,
                a."readTime" AS read_time,
                COALESCE(a."isPublic", TRUE) AS is_public,
                a."publishedAt" AS published_at,
                u.id AS author_id,
                u.name AS author_name,
                u.username AS author_username,
                u.avatar AS author_avatar,
                0::BIGINT AS like_count,
                0::BIGINT AS comment_count
            FROM "Article" a
            LEFT JOIN "User" u ON u.id = a."authorId"
            WHERE a.status = 'PUBLISHED'
            ORDER BY COALESCE(a."publishedAt", a."createdAt") DESC
            LIMIT $1
            "#
        )
        .bind(limit * 2)
        .fetch_all(&state.db),

        sqlx::query_as::<_, EventRow>(
            r#"
            SELECT
                e.id,
                e.title,
                COALESCE(e.description, '') AS description,
                e."coverImage" AS cover_image,
                e."startTime" AS start_time,
                e."endTime" AS end_time,
                e.location,
                e.price,
                COALESCE(e."isPublic", TRUE) AS is_public,
                e."createdAt" AS created_at,
                u.id AS host_id,
                u.name AS host_name,
                u.username AS host_username,
                u.avatar AS host_avatar,
                0::BIGINT AS rsvp_count
            FROM "Event" e
            LEFT JOIN "User" u ON u.id = e."hostId"
            WHERE e.status = 'PUBLISHED'
            ORDER BY e."createdAt" DESC
            LIMIT $1
            "#
        )
        .bind(limit * 2)
        .fetch_all(&state.db)
    )?;

    let mut items: Vec<FeedItem> = Vec::new();

    // Add posts
    for post in posts {
        let slug = to_slug(post.author_username.as_deref(), &post.author_name);
        let likes = post.like_count;
        let comments = post.comment_count;
        let popularity_score = (likes * 3 + comments * 4) as i32;

        let excerpt_text = if post.excerpt.is_empty() {
            None
        } else {
            Some(post.excerpt.clone())
        };

        items.push(FeedItem {
            id: format!("post_{}", post.id),
            source_id: post.id.clone(),
            item_type: "post".to_string(),
            title: post.title,
            summary: excerpt_text.clone(),
            preview: excerpt_text,
            cover_image: post.images.and_then(|imgs| imgs.first().cloned()),
            published_at: post.published_at
                .map(format_datetime)
                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
            link: format!("/creators/{}?tab=posts&post={}", slug, post.id),
            creator: FeedCreator {
                id: post.author_id,
                name: post.author_name.clone(),
                username: post.author_username.clone(),
                avatar: post.author_avatar,
                slug,
            },
            popularity_score,
            is_highlight: popularity_score >= 12,
            is_new: false,
            is_saved: false,
            badges: vec![],
            meta: FeedMeta {
                likes: Some(likes),
                comments: Some(comments),
                rsvps: None,
                visibility: if post.is_public { "public" } else { "supporters" }.to_string(),
            },
        });
    }

    // Add articles
    for article in articles {
        let slug = to_slug(article.author_username.as_deref(), &article.author_name);
        let likes = article.like_count;
        let comments = article.comment_count;
        let popularity_score = (likes * 3 + comments * 4) as i32;

        let excerpt_text = if article.excerpt.is_empty() {
            None
        } else {
            Some(article.excerpt.clone())
        };

        items.push(FeedItem {
            id: format!("article_{}", article.id),
            source_id: article.id.clone(),
            item_type: "article".to_string(),
            title: article.title,
            summary: excerpt_text.clone(),
            preview: excerpt_text,
            cover_image: article.cover_image,
            published_at: article.published_at
                .map(format_datetime)
                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
            link: format!("/blog/{}", article.slug),
            creator: FeedCreator {
                id: article.author_id,
                name: article.author_name.clone(),
                username: article.author_username.clone(),
                avatar: article.author_avatar,
                slug,
            },
            popularity_score,
            is_highlight: popularity_score >= 12,
            is_new: false,
            is_saved: false,
            badges: vec![],
            meta: FeedMeta {
                likes: Some(likes),
                comments: Some(comments),
                rsvps: None,
                visibility: if article.is_public { "public" } else { "supporters" }.to_string(),
            },
        });
    }

    // Add events
    for event in events {
        let slug = to_slug(event.host_username.as_deref(), &event.host_name);
        let rsvps = event.rsvp_count;
        let popularity_score = (rsvps * 2) as i32;

        items.push(FeedItem {
            id: format!("event_{}", event.id),
            source_id: event.id.clone(),
            item_type: "event".to_string(),
            title: event.title,
            summary: Some(event.description.chars().take(200).collect()),
            preview: Some(event.description),
            cover_image: event.cover_image,
            published_at: format_datetime(event.created_at),
            link: format!("/events/{}", event.id),
            creator: FeedCreator {
                id: event.host_id,
                name: event.host_name.clone(),
                username: event.host_username.clone(),
                avatar: event.host_avatar,
                slug,
            },
            popularity_score,
            is_highlight: popularity_score >= 6,
            is_new: false,
            is_saved: false,
            badges: vec![],
            meta: FeedMeta {
                likes: None,
                comments: None,
                rsvps: Some(rsvps),
                visibility: if event.is_public { "public" } else { "supporters" }.to_string(),
            },
        });
    }

    // Sort all items by published date
    items.sort_by(|a, b| b.published_at.cmp(&a.published_at));

    // Apply pagination
    let total = items.len() as i64;
    let start = ((page - 1) * limit) as usize;
    let end = (start + limit as usize).min(items.len());
    let paginated_items: Vec<FeedItem> = items[start..end].to_vec();

    let highlights = items
        .iter()
        .filter(|item| item.is_highlight)
        .take(6)
        .cloned()
        .collect();

    let pages = if total == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as i32
    };

    Ok(ApiResponse::success(FeedResponse {
        items: paginated_items,
        highlights,
        pagination: FeedPagination {
            page,
            limit,
            total,
            pages,
        },
    }))
}
