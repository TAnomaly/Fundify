use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post},
    Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedQuery {
    pub cursor: Option<String>,
    pub limit: Option<u32>,
    #[serde(rename = "type")]
    pub filter: Option<String>,
    pub sort: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkPayload {
    pub content_type: Option<String>,
    pub content_id: Option<String>,
}

pub fn feed_routes() -> Router<Database> {
    Router::new().route("/", get(get_feed)).route(
        "/bookmarks",
        get(get_bookmarks)
            .post(add_bookmark)
            .delete(remove_bookmark),
    )
}

async fn get_feed(
    State(db): State<Database>,
    claims: Claims,
    Query(params): Query<FeedQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let filter = params.filter.unwrap_or_else(|| "all".to_string());
    let sort = params.sort.unwrap_or_else(|| "recent".to_string());
    let period_str = params.period.unwrap_or_else(|| "72h".to_string());
    let period_value = period_str
        .trim_end_matches(|c: char| !c.is_ascii_digit())
        .parse::<i64>()
        .unwrap_or(72);
    let limit = params.limit.unwrap_or(20).min(50) as i64;
    let per_type_limit = (limit.max(6) / 3).max(3);
    let cutoff = Utc::now() - Duration::hours(period_value.max(1));

    // Try cache first
    let cache_key = format!("feed:{}:{}:{}:{}:{}", claims.sub, filter, sort, period_str, limit);
    if let Some(redis) = &db.redis {
        let mut redis_clone = redis.clone();
        if let Ok(Some(cached)) = redis_clone.get(&cache_key).await {
            tracing::debug!("Cache HIT for feed: {}", cache_key);
            if let Ok(cached_value) = serde_json::from_str::<serde_json::Value>(&cached) {
                return Ok(Json(cached_value));
            }
        }
        tracing::debug!("Cache MISS for feed: {}", cache_key);
    }

    struct FeedEntry {
        published_at: chrono::DateTime<chrono::Utc>,
        item_type: String,
        value: serde_json::Value,
    }

    let mut entries: Vec<FeedEntry> = Vec::new();

    // Latest posts
    let post_rows = sqlx::query(
        r#"
        SELECT
            p.id,
            p.title,
            p.content,
            p.media_url,
            p.media_type,
            p.image_urls,
            p.video_url,
            p.is_premium,
            p.created_at,
            u.id AS creator_id,
            COALESCE(u.display_name, u.username) AS creator_name,
            u.username,
            u.avatar_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.created_at >= $1
        ORDER BY p.created_at DESC
        LIMIT $2
        "#,
    )
    .bind(cutoff)
    .bind(per_type_limit)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load posts for feed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    for row in post_rows {
        let id: Uuid = row.try_get("id").unwrap_or_else(|_| Uuid::new_v4());
        let creator_id: String = row.try_get::<String, _>("creator_id").unwrap_or_default();
        let creator_username: Option<String> = row.try_get("username").ok();
        let creator_name: Option<String> = row.try_get("creator_name").ok();
        let creator_avatar: Option<String> = row.try_get("avatar_url").ok();
        let created_at: chrono::DateTime<chrono::Utc> =
            row.try_get("created_at").unwrap_or(Utc::now());
        let media_url: Option<String> = row.try_get("media_url").ok();
        let image_urls: Option<Vec<String>> = row.try_get("image_urls").ok();
        let video_url: Option<String> = row.try_get("video_url").ok();

        // Use first image from image_urls, or video_url, or media_url as cover
        let cover_image = image_urls
            .as_ref()
            .and_then(|imgs| imgs.first().cloned())
            .or_else(|| video_url.clone())
            .or_else(|| media_url.clone());

        let content: Option<String> = row.try_get("content").ok();
        let title: String = row
            .try_get("title")
            .unwrap_or_else(|_| "New post".to_string());
        let summary = content
            .as_ref()
            .map(|c| c.trim().chars().take(160).collect::<String>());

        let is_premium: bool = row.try_get("is_premium").unwrap_or(false);
        let mut meta = json!({
            "likes": 0,
            "comments": 0,
            "visibility": if is_premium {
                "supporters"
            } else {
                "public"
            }
        });

        if let Some(object) = meta.as_object_mut() {
            object.insert("periodStart".to_string(), json!(cutoff));
        }

        entries.push(FeedEntry {
            published_at: created_at,
            item_type: "posts".to_string(),
            value: json!({
                "id": format!("post-{}", id),
                "sourceId": id.to_string(),
                "type": "post",
                "title": title,
                "summary": summary,
                "preview": content,
                "coverImage": cover_image,
                "publishedAt": created_at,
                "link": format!("/creators/{}", creator_username.clone().unwrap_or_else(|| creator_id.clone())),
                "creator": {
                    "id": creator_id,
                    "name": creator_name.clone().unwrap_or_else(|| "Creator".to_string()),
                    "username": creator_username,
                    "avatar": creator_avatar,
                },
                "popularityScore": 0,
                "isHighlight": false,
                "isNew": true,
                "isSaved": false,
                "badges": [],
                "meta": meta,
            }),
        });
    }

    // Latest articles
    let article_rows = sqlx::query(
        r#"
        SELECT 
            a.id,
            a.slug,
            a.title,
            a.content,
            a.published_at,
            a.created_at,
            u.id AS creator_id,
            COALESCE(u.display_name, u.username) AS creator_name,
            u.username,
            u.avatar_url
        FROM articles a
        JOIN users u ON a.author_id = u.id
        WHERE a.created_at >= $1
        ORDER BY a.created_at DESC
        LIMIT $2
        "#,
    )
    .bind(cutoff)
    .bind(per_type_limit)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load articles for feed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    for row in article_rows {
        let id: Uuid = row.try_get("id").unwrap_or_else(|_| Uuid::new_v4());
        let slug: String = row.try_get("slug").unwrap_or_else(|_| id.to_string());
        let created_at: chrono::DateTime<chrono::Utc> =
            row.try_get("created_at").unwrap_or(Utc::now());
        let published_at: Option<chrono::DateTime<chrono::Utc>> = row.try_get("published_at").ok();
        let creator_id: String = row.try_get("creator_id").unwrap_or_default();
        let creator_name: Option<String> = row.try_get("creator_name").ok();
        let creator_username: Option<String> = row.try_get("username").ok();
        let creator_avatar: Option<String> = row.try_get("avatar_url").ok();
        let content: Option<String> = row.try_get("content").ok();
        let summary = content
            .as_ref()
            .map(|c| c.trim().chars().take(200).collect::<String>());

        entries.push(FeedEntry {
            published_at: published_at.unwrap_or(created_at),
            item_type: "articles".to_string(),
            value: json!({
                "id": format!("article-{}", id),
                "sourceId": id.to_string(),
                "type": "article",
                "title": row.try_get::<String, _>("title").unwrap_or_else(|_| "New article".to_string()),
                "summary": summary,
                "preview": content,
                "coverImage": null,
                "publishedAt": published_at.unwrap_or(created_at),
                "link": format!("/blog/{}", slug),
                "creator": {
                    "id": creator_id,
                    "name": creator_name.clone().unwrap_or_else(|| "Creator".to_string()),
                    "username": creator_username,
                    "avatar": creator_avatar,
                },
                "popularityScore": 0,
                "isHighlight": false,
                "isNew": true,
                "isSaved": false,
                "badges": [],
                "meta": {
                    "likes": 0,
                    "comments": 0,
                    "readTime": null,
                    "visibility": "public"
                },
            }),
        });
    }

    // Upcoming events
    let event_rows = sqlx::query(
        r#"
        SELECT 
            e.id,
            e.title,
            e.description,
            e.start_time,
            e.end_time,
            e.location,
            e.price,
            e.created_at,
            u.id AS creator_id,
            COALESCE(u.display_name, u.username) AS creator_name,
            u.username,
            u.avatar_url
        FROM events e
        JOIN users u ON e.host_id = u.id
        WHERE e.created_at >= $1
        ORDER BY e.start_time ASC
        LIMIT $2
        "#,
    )
    .bind(cutoff)
    .bind(per_type_limit)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load events for feed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    for row in event_rows {
        let id: Uuid = row.try_get("id").unwrap_or_else(|_| Uuid::new_v4());
        let start_time: Option<chrono::DateTime<chrono::Utc>> = row.try_get("start_time").ok();
        let end_time: Option<chrono::DateTime<chrono::Utc>> = row.try_get("end_time").ok();
        let created_at: chrono::DateTime<chrono::Utc> =
            row.try_get("created_at").unwrap_or(Utc::now());
        let creator_id: String = row.try_get("creator_id").unwrap_or_default();
        let creator_name: Option<String> = row.try_get("creator_name").ok();
        let creator_username: Option<String> = row.try_get("username").ok();
        let creator_avatar: Option<String> = row.try_get("avatar_url").ok();
        let location: Option<String> = row.try_get("location").ok();
        let price: Option<f64> = row.try_get("price").ok();

        entries.push(FeedEntry {
            published_at: start_time.unwrap_or(created_at),
            item_type: "events".to_string(),
            value: json!({
                "id": format!("event-{}", id),
                "sourceId": id.to_string(),
                "type": "event",
                "title": row.try_get::<String, _>("title").unwrap_or_else(|_| "Upcoming event".to_string()),
                "summary": row.try_get::<Option<String>, _>("description").ok().flatten(),
                "preview": null,
                "coverImage": null,
                "publishedAt": start_time.unwrap_or(created_at),
                "link": format!("/creators/{}?tab=events", creator_username.clone().unwrap_or_else(|| creator_id.clone())),
                "creator": {
                    "id": creator_id,
                    "name": creator_name.clone().unwrap_or_else(|| "Creator".to_string()),
                    "username": creator_username,
                    "avatar": creator_avatar,
                },
                "popularityScore": 0,
                "isHighlight": false,
                "isNew": true,
                "isSaved": false,
                "badges": [],
                "meta": {
                    "rsvps": 0,
                    "startTime": start_time,
                    "endTime": end_time,
                    "location": location,
                    "price": price,
                    "visibility": "public"
                },
            }),
        });
    }

    // Sort all entries by published date descending
    entries.sort_by(|a, b| b.published_at.cmp(&a.published_at));

    // Filter by requested filter
    let mut filtered_entries: Vec<FeedEntry> = entries
        .into_iter()
        .filter(|entry| match filter.as_str() {
            "posts" => entry.item_type == "posts",
            "articles" => entry.item_type == "articles",
            "events" => entry.item_type == "events",
            "highlights" => true,
            _ => true,
        })
        .collect();

    if filter == "highlights" {
        filtered_entries.truncate(5);
    } else {
        filtered_entries.truncate(limit as usize);
    }

    let mut items: Vec<serde_json::Value> = Vec::new();
    let mut highlights: Vec<serde_json::Value> = Vec::new();

    for (idx, entry) in filtered_entries.into_iter().enumerate() {
        let mut item = entry.value;
        if idx < 3 && filter != "posts" && filter != "articles" && filter != "events" {
            if let Some(obj) = item.as_object_mut() {
                obj.insert("isHighlight".to_string(), json!(true));
            }
            highlights.push(item.clone());
        }
        items.push(item);
    }

    if highlights.is_empty() {
        highlights = items.iter().take(2).cloned().collect();
    }

    let recommended_content: Vec<serde_json::Value> =
        items.iter().skip(3).take(3).cloned().collect();

    // Recommended creators
    let recommended_creators_rows = sqlx::query(
        r#"
        SELECT 
            u.id,
            COALESCE(u.display_name, u.username) AS name,
            u.username,
            u.avatar_url,
            u.bio,
            COALESCE(fc.count, 0) AS follower_count,
            EXISTS(
                SELECT 1 FROM follows f
                WHERE f.follower_id = $1 AND f.following_id = u.id
            ) AS is_followed
        FROM users u
        LEFT JOIN (
            SELECT following_id, COUNT(*)::BIGINT AS count
            FROM follows
            GROUP BY following_id
        ) fc ON fc.following_id = u.id
        WHERE u.is_creator = true AND u.id <> $1
        ORDER BY follower_count DESC, u.created_at DESC
        LIMIT 6
        "#,
    )
    .bind(&claims.sub)
    .fetch_all(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load recommended creators: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let recommended_creators: Vec<serde_json::Value> = recommended_creators_rows
        .into_iter()
        .map(|row| {
            json!({
                "id": row.try_get::<String, _>("id").unwrap_or_default(),
                "name": row.try_get::<Option<String>, _>("name").ok().flatten().unwrap_or_else(|| "Creator".to_string()),
                "username": row.try_get::<Option<String>, _>("username").ok().flatten(),
                "avatar": row.try_get::<Option<String>, _>("avatar_url").ok().flatten(),
                "creatorBio": row.try_get::<Option<String>, _>("bio").ok().flatten(),
                "followerCount": row.try_get::<Option<i64>, _>("follower_count").ok().flatten().unwrap_or(0),
                "isFollowed": row.try_get::<bool, _>("is_followed").unwrap_or(false),
                "slug": row.try_get::<Option<String>, _>("username").ok().flatten().unwrap_or_default(),
            })
        })
        .collect();

    let response = json!({
        "success": true,
        "data": {
            "items": items,
            "highlights": highlights,
            "recommendedContent": recommended_content,
            "recommendedCreators": recommended_creators,
            "filters": {
                "filter": filter,
                "sort": sort,
                "period": period_value
            },
            "summary": {
                "totalItems": items.len(),
                "highlightCount": highlights.len(),
                "recommendationsCount": recommended_content.len()
            },
            "nextCursor": null,
            "hasMore": false
        }
    });

    // Cache the response
    if let Some(redis) = &db.redis {
        let mut redis_clone = redis.clone();
        if let Ok(response_str) = serde_json::to_string(&response) {
            let _ = redis_clone.set_ex(&cache_key, &response_str, 60).await;
        }
    }

    Ok(Json(response))
}

async fn get_bookmarks(
    _state: State<Database>,
    _claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "success": true,
        "data": []
    });

    Ok(Json(response))
}

async fn add_bookmark(
    _state: State<Database>,
    _claims: Claims,
    Json(_payload): Json<BookmarkPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "success": true
    });

    Ok(Json(response))
}

async fn remove_bookmark(
    _state: State<Database>,
    _claims: Claims,
    Json(_payload): Json<BookmarkPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "success": true
    });

    Ok(Json(response))
}
