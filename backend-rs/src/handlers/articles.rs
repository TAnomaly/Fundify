use std::collections::HashMap;

use axum::extract::{Json, Path, Query, State};
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Postgres, QueryBuilder, Row};
use uuid::Uuid;

use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

const ARTICLE_SELECT_BASE: &str = r#"
    SELECT
        a.id,
        a.slug,
        a.title,
        a.excerpt,
        a."coverImage" AS cover_image,
        a.status::text AS status,
        a."publishedAt" AS published_at,
        a."createdAt" AS created_at,
        a."updatedAt" AS updated_at,
        a."readTime" AS read_time,
        a."viewCount" AS view_count,
        a."isPublic" AS is_public,
        a."isPremium" AS is_premium,
        u.id AS author_id,
        u.name AS author_name,
        u.avatar AS author_avatar,
        COALESCE(comments.comment_count, 0) AS comment_count,
        COALESCE(likes.like_count, 0) AS like_count
    FROM "Article" a
    LEFT JOIN "User" u ON u.id = a."authorId"
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT AS comment_count
        FROM "ArticleComment" ac
        WHERE ac."articleId" = a.id
    ) comments ON TRUE
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT AS like_count
        FROM "ArticleLike" al
        WHERE al."articleId" = a.id
    ) likes ON TRUE
    WHERE 1=1
"#;

#[derive(Debug, Deserialize)]
pub struct ListArticlesQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    pub category: Option<String>,
    pub tag: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "authorId")]
    pub author_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

#[derive(Debug, Serialize)]
pub struct ArticleAuthor {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ArticleCategoryItem {
    pub category: CategoryInfo,
}

#[derive(Debug, Clone, Serialize)]
pub struct TagInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Serialize)]
pub struct ArticleTagItem {
    pub tag: TagInfo,
}

#[derive(Debug, Serialize)]
pub struct ArticleCounts {
    pub likes: i64,
    pub comments: i64,
}

#[derive(Debug, Serialize)]
pub struct ArticleItem {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    pub status: String,
    #[serde(rename = "publishedAt")]
    pub published_at: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "readTime")]
    pub read_time: i32,
    #[serde(rename = "viewCount")]
    pub view_count: i32,
    #[serde(rename = "isPublic")]
    pub is_public: bool,
    #[serde(rename = "isPremium")]
    pub is_premium: bool,
    pub author: ArticleAuthor,
    pub categories: Vec<ArticleCategoryItem>,
    pub tags: Vec<ArticleTagItem>,
    #[serde(rename = "_count")]
    pub counts: ArticleCounts,
}

#[derive(Debug, Serialize)]
pub struct ArticleListResponse {
    pub articles: Vec<ArticleItem>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, FromRow)]
struct ArticleRow {
    id: String,
    slug: String,
    title: String,
    excerpt: Option<String>,
    cover_image: Option<String>,
    status: String,
    published_at: Option<NaiveDateTime>,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
    read_time: Option<i32>,
    view_count: i32,
    is_public: bool,
    is_premium: bool,
    author_id: String,
    author_name: String,
    author_avatar: Option<String>,
    comment_count: i64,
    like_count: i64,
}

fn format_datetime(value: NaiveDateTime) -> String {
    DateTime::<Utc>::from_naive_utc_and_offset(value, Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn format_optional_datetime(value: Option<NaiveDateTime>, fallback: NaiveDateTime) -> String {
    format_datetime(value.unwrap_or(fallback))
}

pub async fn list_articles(
    State(state): State<AppState>,
    Query(params): Query<ListArticlesQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * limit;

    const ALLOWED_STATUS: &[&str] = &["DRAFT", "PUBLISHED", "ARCHIVED"];

    let status_param = params.status.as_ref().map(|s| s.trim().to_uppercase());
    let status_filter = match status_param.as_deref() {
        Some("ALL") => None,
        Some(value) if ALLOWED_STATUS.contains(&value) => Some(value.to_string()),
        Some(_) => Some("PUBLISHED".to_string()),
        None => Some("PUBLISHED".to_string()),
    };

    let category_filter = params.category.as_ref().map(|s| s.trim().to_lowercase());
    let tag_filter = params.tag.as_ref().map(|s| s.trim().to_lowercase());

    let mut qb = QueryBuilder::<Postgres>::new(ARTICLE_SELECT_BASE);

    if let Some(status_value) = status_filter.as_ref() {
        qb.push(" AND a.status::text = ").push_bind(status_value);
    }

    if let Some(author_id) = params.author_id {
        qb.push(" AND a.\"authorId\" = ").push_bind(author_id);
    }

    if let Some(category_slug) = category_filter.as_ref() {
        qb.push(
            " AND EXISTS (SELECT 1 FROM \"ArticleCategory\" ac \
             JOIN \"Category\" c ON c.id = ac.\"categoryId\" \
             WHERE ac.\"articleId\" = a.id AND LOWER(c.slug) = ",
        )
        .push_bind(category_slug)
        .push(")");
    }

    if let Some(tag_slug) = tag_filter.as_ref() {
        qb.push(
            " AND EXISTS (SELECT 1 FROM \"ArticleTag\" at \
             JOIN \"Tag\" t ON t.id = at.\"tagId\" \
             WHERE at.\"articleId\" = a.id AND LOWER(t.slug) = ",
        )
        .push_bind(tag_slug)
        .push(")");
    }

    qb.push(
        " ORDER BY COALESCE(a.\"publishedAt\", a.\"createdAt\") DESC, a.\"createdAt\" DESC LIMIT ",
    )
    .push_bind(limit)
    .push(" OFFSET ")
    .push_bind(offset);

    let rows: Vec<ArticleRow> = qb.build_query_as().fetch_all(&state.db).await?;

    let mut count_qb = QueryBuilder::<Postgres>::new(
        r#"SELECT COUNT(*)::BIGINT AS total FROM "Article" a WHERE 1=1"#,
    );

    if let Some(status_value) = status_filter.as_ref() {
        count_qb.push(" AND a.status::text = ").push_bind(status_value);
    }

    if let Some(author_id) = params.author_id {
        count_qb.push(" AND a.\"authorId\" = ").push_bind(author_id);
    }

    if let Some(category_slug) = category_filter.as_ref() {
        count_qb
            .push(
                " AND EXISTS (SELECT 1 FROM \"ArticleCategory\" ac \
             JOIN \"Category\" c ON c.id = ac.\"categoryId\" \
             WHERE ac.\"articleId\" = a.id AND LOWER(c.slug) = ",
            )
            .push_bind(category_slug)
            .push(")");
    }

    if let Some(tag_slug) = tag_filter.as_ref() {
        count_qb
            .push(
                " AND EXISTS (SELECT 1 FROM \"ArticleTag\" at \
             JOIN \"Tag\" t ON t.id = at.\"tagId\" \
             WHERE at.\"articleId\" = a.id AND LOWER(t.slug) = ",
            )
            .push_bind(tag_slug)
            .push(")");
    }

    let total: i64 = count_qb.build_query_scalar().fetch_one(&state.db).await?;

    let pages = if total == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as i32
    };

    let article_ids: Vec<String> = rows.iter().map(|row| row.id.clone()).collect();

    let categories_map = load_article_categories(&state, &article_ids).await?;
    let tags_map = load_article_tags(&state, &article_ids).await?;

    let articles = rows
        .into_iter()
        .map(|row| {
            let categories = categories_map
                .get(&row.id)
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .map(|category| ArticleCategoryItem { category })
                .collect::<Vec<_>>();

            let tags = tags_map
                .get(&row.id)
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .map(|tag| ArticleTagItem { tag })
                .collect::<Vec<_>>();

            ArticleItem {
                id: row.id,
                slug: row.slug,
                title: row.title,
                excerpt: row.excerpt,
                cover_image: row.cover_image,
                status: row.status,
                published_at: format_optional_datetime(row.published_at, row.created_at),
                created_at: format_datetime(row.created_at),
                updated_at: format_datetime(row.updated_at),
                read_time: row.read_time.unwrap_or(0),
                view_count: row.view_count,
                is_public: row.is_public,
                is_premium: row.is_premium,
                author: ArticleAuthor {
                    id: row.author_id,
                    name: row.author_name,
                    avatar: row.author_avatar,
                },
                categories,
                tags,
                counts: ArticleCounts {
                    likes: row.like_count,
                    comments: row.comment_count,
                },
            }
        })
        .collect();

    let payload = ArticleListResponse {
        articles,
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
pub struct CreateArticleRequest {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "isPublic")]
    pub is_public: Option<bool>,
    #[serde(rename = "isPremium")]
    pub is_premium: Option<bool>,
    #[serde(rename = "readTime")]
    pub read_time: Option<i32>,
    pub status: Option<String>,
}

pub async fn create_article(
    State(state): State<AppState>,
    Json(data): Json<CreateArticleRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // TODO: Get user from JWT token
    // For now, find first creator in database
    let author: Option<(String,)> = sqlx::query_as(
        r#"SELECT id FROM "User" WHERE "isCreator" = TRUE LIMIT 1"#
    )
    .fetch_optional(&state.db)
    .await?;

    let author_id = match author {
        Some((id,)) => id,
        None => {
            return Err(AppError::NotFound(
                "No creator found in database. Please create a creator account first.".to_string()
            ));
        }
    };

    let article_id = Uuid::new_v4();
    let slug = data.title
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric() && c != '-', "-")
        .replace("--", "-")
        .trim_matches('-')
        .to_string() + &format!("-{}", &article_id.to_string()[..8]);

    let status = data.status.as_deref().unwrap_or("DRAFT");
    let is_public = data.is_public.unwrap_or(true);
    let is_premium = data.is_premium.unwrap_or(false);
    let published_at = if status == "PUBLISHED" {
        Some(chrono::Utc::now().naive_utc())
    } else {
        None
    };

    sqlx::query(
        r#"
        INSERT INTO "Article" (
            id, slug, title, content, excerpt, "coverImage",
            "isPublic", "isPremium", "readTime", status, "publishedAt",
            "authorId", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        "#
    )
    .bind(article_id)
    .bind(&slug)
    .bind(&data.title)
    .bind(&data.content)
    .bind(&data.excerpt)
    .bind(&data.cover_image)
    .bind(is_public)
    .bind(is_premium)
    .bind(data.read_time)
    .bind(status)
    .bind(published_at)
    .bind(author_id)
    .execute(&state.db)
    .await?;

    Ok(ApiResponse::success(serde_json::json!({
        "id": article_id,
        "slug": slug,
        "title": data.title,
        "status": status,
    })))
}

pub async fn get_article(
    State(state): State<AppState>,
    Path(identifier): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    let mut qb = QueryBuilder::<Postgres>::new(ARTICLE_SELECT_BASE);

    if let Ok(article_id) = Uuid::parse_str(&identifier) {
        qb.push(" AND a.id = ").push_bind(article_id);
    } else {
        qb.push(" AND LOWER(a.slug) = ")
            .push_bind(identifier.to_lowercase());
    }

    qb.push(" LIMIT 1");

    let row: Option<ArticleRow> = qb.build_query_as().fetch_optional(&state.db).await?;

    let row = row.ok_or_else(|| AppError::NotFound("Article not found".to_string()))?;

    let article_id = row.id.clone();
    let article_ids = vec![article_id.clone()];
    let categories_map = load_article_categories(&state, &article_ids).await?;
    let tags_map = load_article_tags(&state, &article_ids).await?;

    let categories = categories_map
        .get(&article_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|category| ArticleCategoryItem { category })
        .collect::<Vec<_>>();

    let tags = tags_map
        .get(&article_id)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|tag| ArticleTagItem { tag })
        .collect::<Vec<_>>();

    let article = ArticleItem {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        cover_image: row.cover_image,
        status: row.status,
        published_at: format_optional_datetime(row.published_at, row.created_at),
        created_at: format_datetime(row.created_at),
        updated_at: format_datetime(row.updated_at),
        read_time: row.read_time.unwrap_or(0),
        view_count: row.view_count,
        is_public: row.is_public,
        is_premium: row.is_premium,
        author: ArticleAuthor {
            id: row.author_id,
            name: row.author_name,
            avatar: row.author_avatar,
        },
        categories,
        tags,
        counts: ArticleCounts {
            likes: row.like_count,
            comments: row.comment_count,
        },
    };

    Ok(ApiResponse::success(article))
}

async fn load_article_categories(
    state: &AppState,
    article_ids: &[String],
) -> Result<HashMap<String, Vec<CategoryInfo>>, sqlx::Error> {
    if article_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query(
        r#"
        SELECT
            ac."articleId" AS article_id,
            c.id AS category_id,
            c.name AS category_name,
            c.slug AS category_slug,
            c.color AS category_color
        FROM "ArticleCategory" ac
        JOIN "Category" c ON c.id = ac."categoryId"
        WHERE ac."articleId" = ANY($1)
        ORDER BY c.name
        "#,
    )
    .bind(article_ids)
    .fetch_all(&state.db)
    .await?;

    let mut map: HashMap<String, Vec<CategoryInfo>> = HashMap::new();

    for row in rows {
        let article_id: String = row.get("article_id");
        let entry = map.entry(article_id).or_default();
        entry.push(CategoryInfo {
            id: row.get::<Uuid, _>("category_id").to_string(),
            name: row.get("category_name"),
            slug: row.get("category_slug"),
            color: row.get("category_color"),
        });
    }

    Ok(map)
}

async fn load_article_tags(
    state: &AppState,
    article_ids: &[String],
) -> Result<HashMap<String, Vec<TagInfo>>, sqlx::Error> {
    if article_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query(
        r#"
        SELECT
            at."articleId" AS article_id,
            t.id AS tag_id,
            t.name AS tag_name,
            t.slug AS tag_slug
        FROM "ArticleTag" at
        JOIN "Tag" t ON t.id = at."tagId"
        WHERE at."articleId" = ANY($1)
        ORDER BY t.name
        "#,
    )
    .bind(article_ids)
    .fetch_all(&state.db)
    .await?;

    let mut map: HashMap<String, Vec<TagInfo>> = HashMap::new();

    for row in rows {
        let article_id: String = row.get("article_id");
        let entry = map.entry(article_id).or_default();
        entry.push(TagInfo {
            id: row.get::<Uuid, _>("tag_id").to_string(),
            name: row.get("tag_name"),
            slug: row.get("tag_slug"),
        });
    }

    Ok(map)
}
