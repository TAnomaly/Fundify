use axum::extract::{Path, Query, State};
use axum::Json;
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(Debug, Deserialize)]
pub struct ListPostsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    #[serde(rename = "authorId")]
    pub author_id: Option<String>,
    #[serde(rename = "creatorId")]
    pub creator_id: Option<String>,
    pub published: Option<bool>,
    #[serde(rename = "isPublic")]
    pub is_public: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

#[derive(Debug, Serialize)]
pub struct PostAuthor {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PostCounts {
    pub likes: i64,
    pub comments: i64,
}

#[derive(Debug, Serialize)]
pub struct PostItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Vec<String>,
    #[serde(rename = "videoUrl")]
    pub video_url: Option<String>,
    pub attachments: Option<serde_json::Value>,
    #[serde(rename = "isPublic")]
    pub is_public: bool,
    pub published: bool,
    #[serde(rename = "publishedAt")]
    pub published_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "minimumTierId")]
    pub minimum_tier_id: Option<String>,
    pub author: PostAuthor,
    #[serde(rename = "_count")]
    pub counts: PostCounts,
}

#[derive(Debug, Serialize)]
pub struct PostListResponse {
    pub posts: Vec<PostItem>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, FromRow)]
struct PostRow {
    id: String,
    title: String,
    content: String,
    excerpt: Option<String>,
    images: Option<Vec<String>>,
    video_url: Option<String>,
    attachments: Option<serde_json::Value>,
    is_public: bool,
    published: bool,
    published_at: Option<NaiveDateTime>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
    minimum_tier_id: Option<String>,
    author_id: String,
    author_name: String,
    author_avatar: Option<String>,
    like_count: i64,
    comment_count: i64,
}

fn format_datetime(value: NaiveDateTime) -> String {
    DateTime::<Utc>::from_naive_utc_and_offset(value, Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub async fn list_posts(
    State(state): State<AppState>,
    Query(params): Query<ListPostsQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut qb = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            p.id,
            p.title,
            p.content,
            p.excerpt,
            p.images,
            p."videoUrl" AS video_url,
            p.attachments,
            p."isPublic" AS is_public,
            p.published,
            p."publishedAt" AS published_at,
            p."createdAt" AS created_at,
            p."updatedAt" AS updated_at,
            p."minimumTierId" AS minimum_tier_id,
            u.id AS author_id,
            u.name AS author_name,
            u.avatar AS author_avatar,
            COALESCE(p."likeCount", 0)::BIGINT AS like_count,
            COALESCE(p."commentCount", 0)::BIGINT AS comment_count
        FROM "CreatorPost" p
        LEFT JOIN "User" u ON u.id = p."authorId"
        WHERE 1=1
        "#,
    );

    let published_filter = params.published.unwrap_or(true);
    if published_filter {
        qb.push(" AND p.published = TRUE");
    } else if params.published.is_some() {
        qb.push(" AND p.published = FALSE");
    }

    if let Some(is_public) = params.is_public {
        if is_public {
            qb.push(" AND p.\"isPublic\" = TRUE");
        } else {
            qb.push(" AND p.\"isPublic\" = FALSE");
        }
    }

    if let Some(author_id) = params.author_id.clone().or(params.creator_id.clone()) {
        qb.push(" AND p.\"authorId\" = ").push_bind(author_id);
    }

    qb.push(
        " ORDER BY COALESCE(p.\"publishedAt\", p.\"createdAt\") DESC, p.\"createdAt\" DESC LIMIT ",
    )
    .push_bind(limit)
    .push(" OFFSET ")
    .push_bind(offset);

    let rows: Vec<PostRow> = qb.build_query_as().fetch_all(&state.db).await?;

    let mut count_qb = QueryBuilder::<Postgres>::new(
        r#"SELECT COUNT(*)::BIGINT AS total FROM "CreatorPost" p WHERE 1=1"#,
    );

    if published_filter {
        count_qb.push(" AND p.published = TRUE");
    } else if params.published.is_some() {
        count_qb.push(" AND p.published = FALSE");
    }

    if let Some(is_public) = params.is_public {
        if is_public {
            count_qb.push(" AND p.\"isPublic\" = TRUE");
        } else {
            count_qb.push(" AND p.\"isPublic\" = FALSE");
        }
    }

    if let Some(author_id) = params.author_id.clone().or(params.creator_id.clone()) {
        count_qb.push(" AND p.\"authorId\" = ").push_bind(author_id);
    }

    let total: i64 = count_qb.build_query_scalar().fetch_one(&state.db).await?;

    let pages = if total == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as i32
    };

    let posts = rows
        .into_iter()
        .map(|row| PostItem {
            id: row.id,
            title: row.title,
            content: row.content,
            excerpt: row.excerpt,
            images: row.images.unwrap_or_default(),
            video_url: row.video_url,
            attachments: row.attachments,
            is_public: row.is_public,
            published: row.published,
            published_at: row.published_at.map(format_datetime),
            created_at: format_datetime(row.created_at),
            updated_at: format_datetime(row.updated_at),
            minimum_tier_id: row.minimum_tier_id,
            author: PostAuthor {
                id: row.author_id,
                name: row.author_name,
                avatar: row.author_avatar,
            },
            counts: PostCounts {
                likes: row.like_count,
                comments: row.comment_count,
            },
        })
        .collect::<Vec<_>>();

    let payload = PostListResponse {
        posts,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages,
        },
    };

    Ok(ApiResponse::success(payload))
}

#[derive(Debug, Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub images: Option<Vec<String>>,
    #[serde(rename = "videoUrl")]
    pub video_url: Option<String>,
    pub attachments: Option<serde_json::Value>,
    #[serde(rename = "isPublic")]
    pub is_public: Option<bool>,
    #[serde(rename = "minimumTierId")]
    pub minimum_tier_id: Option<String>,
    pub published: Option<bool>,
    #[serde(rename = "publishedAt")]
    pub published_at: Option<String>,
}

pub async fn create_post(
    State(state): State<AppState>,
    Json(data): Json<CreatePostRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // TODO: Get user from JWT token
    // For now, find first creator in database
    let author: Option<(String,)> =
        sqlx::query_as(r#"SELECT id FROM "User" WHERE "isCreator" = TRUE LIMIT 1"#)
            .fetch_optional(&state.db)
            .await?;

    let author_id = match author {
        Some((id,)) => id,
        None => {
            return Err(AppError::NotFound(
                "No creator found in database. Please create a creator account first.".to_string(),
            ));
        }
    };

    let post_id = uuid::Uuid::new_v4().to_string();
    let post_id_clone = post_id.clone();
    let is_public = data.is_public.unwrap_or(false);
    let published = data.published.unwrap_or(true);
    let published_at = if published {
        chrono::Utc::now().naive_utc()
    } else {
        chrono::NaiveDateTime::from_timestamp_opt(0, 0).unwrap()
    };

    let images_json = data
        .images
        .as_ref()
        .map(|imgs| serde_json::to_value(imgs).unwrap())
        .unwrap_or(serde_json::Value::Array(vec![]));

    sqlx::query(
        r#"
        INSERT INTO "CreatorPost" (
            id, title, content, excerpt, images, "videoUrl", attachments,
            "isPublic", "minimumTierId", published, "publishedAt",
            "authorId", type, "likeCount", "commentCount", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'TEXT', 0, 0, NOW(), NOW())
        "#,
    )
    .bind(&post_id)
    .bind(&data.title)
    .bind(&data.content)
    .bind(&data.excerpt)
    .bind(images_json)
    .bind(&data.video_url)
    .bind(&data.attachments)
    .bind(is_public)
    .bind(&data.minimum_tier_id)
    .bind(published)
    .bind(published_at)
    .bind(author_id)
    .execute(&state.db)
    .await?;

    // Fetch the created post with author info
    let post: Option<PostRow> = sqlx::query_as(
        r#"
        SELECT
            p.id,
            p.title,
            p.content,
            p.excerpt,
            p.images,
            p."videoUrl" AS video_url,
            p.attachments,
            p."isPublic" AS is_public,
            p.published,
            p."publishedAt" AS published_at,
            p."createdAt" AS created_at,
            p."updatedAt" AS updated_at,
            p."minimumTierId" AS minimum_tier_id,
            u.id AS author_id,
            u.name AS author_name,
            u.avatar AS author_avatar,
            0::BIGINT AS like_count,
            0::BIGINT AS comment_count
        FROM "CreatorPost" p
        LEFT JOIN "User" u ON u.id = p."authorId"
        WHERE p.id = $1
        "#,
    )
    .bind(&post_id)
    .fetch_optional(&state.db)
    .await?;

    let row = post.ok_or_else(|| AppError::Internal("Failed to create post".to_string()))?;

    let post_item = PostItem {
        id: row.id,
        title: row.title,
        content: row.content,
        excerpt: row.excerpt,
        images: row.images.unwrap_or_default(),
        video_url: row.video_url,
        attachments: row.attachments,
        is_public: row.is_public,
        published: row.published,
        published_at: row.published_at.map(format_datetime),
        created_at: format_datetime(row.created_at),
        updated_at: format_datetime(row.updated_at),
        minimum_tier_id: row.minimum_tier_id,
        author: PostAuthor {
            id: row.author_id,
            name: row.author_name,
            avatar: row.author_avatar,
        },
        counts: PostCounts {
            likes: row.like_count,
            comments: row.comment_count,
        },
    };

    Ok(ApiResponse::success(post_item))
}

pub async fn get_post(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    let row: Option<PostRow> = sqlx::query_as(
        r#"
        SELECT
            p.id,
            p.title,
            p.content,
            p.excerpt,
            p.images,
            p."videoUrl" AS video_url,
            p.attachments,
            p."isPublic" AS is_public,
            p.published,
            p."publishedAt" AS published_at,
            p."createdAt" AS created_at,
            p."updatedAt" AS updated_at,
            p."minimumTierId" AS minimum_tier_id,
            u.id AS author_id,
            u.name AS author_name,
            u.avatar AS author_avatar,
            COALESCE(p."likeCount", 0)::BIGINT AS like_count,
            COALESCE(p."commentCount", 0)::BIGINT AS comment_count
        FROM "CreatorPost" p
        LEFT JOIN "User" u ON u.id = p."authorId"
        WHERE p.id = $1
        LIMIT 1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;

    let row = row.ok_or_else(|| AppError::NotFound("Post not found".to_string()))?;

    let post = PostItem {
        id: row.id,
        title: row.title,
        content: row.content,
        excerpt: row.excerpt,
        images: row.images.unwrap_or_default(),
        video_url: row.video_url,
        attachments: row.attachments,
        is_public: row.is_public,
        published: row.published,
        published_at: row.published_at.map(format_datetime),
        created_at: format_datetime(row.created_at),
        updated_at: format_datetime(row.updated_at),
        minimum_tier_id: row.minimum_tier_id,
        author: PostAuthor {
            id: row.author_id,
            name: row.author_name,
            avatar: row.author_avatar,
        },
        counts: PostCounts {
            likes: row.like_count,
            comments: row.comment_count,
        },
    };

    Ok(ApiResponse::success(post))
}
