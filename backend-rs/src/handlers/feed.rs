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
        excerpt: Option<String>,
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

    let posts: Vec<PostRow> = sqlx::query_as(
        r#"
        SELECT
            p.id,
            p.title,
            p.excerpt,
            p.content,
            p.images,
            p."isPublic" AS is_public,
            p."publishedAt" AS published_at,
            u.id AS author_id,
            u.name AS author_name,
            u.username AS author_username,
            u.avatar AS author_avatar,
            COALESCE(likes.cnt, 0) AS like_count,
            COALESCE(comments.cnt, 0) AS comment_count
        FROM "CreatorPost" p
        LEFT JOIN "User" u ON u.id = p."authorId"
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::BIGINT AS cnt FROM "PostLike" WHERE "postId" = p.id
        ) likes ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::BIGINT AS cnt FROM "PostComment" WHERE "postId" = p.id
        ) comments ON TRUE
        WHERE p.published = TRUE AND p."isPublic" = TRUE
        ORDER BY COALESCE(p."publishedAt", p."createdAt") DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)::BIGINT FROM "CreatorPost" WHERE published = TRUE AND "isPublic" = TRUE"#
    )
    .fetch_one(&state.db)
    .await?;

    let items: Vec<FeedItem> = posts
        .into_iter()
        .map(|post| {
            let slug = to_slug(post.author_username.as_deref(), &post.author_name);
            let likes = post.like_count;
            let comments = post.comment_count;
            let popularity_score = (likes * 3 + comments * 4) as i32;

            FeedItem {
                id: format!("post_{}", post.id),
                source_id: post.id.clone(),
                item_type: "post".to_string(),
                title: post.title,
                summary: post.excerpt.clone(),
                preview: post.excerpt,
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
            }
        })
        .collect();

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
        items,
        highlights,
        pagination: FeedPagination {
            page,
            limit,
            total,
            pages,
        },
    }))
}
