use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::Json as ResponseJson,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use crate::{auth::Claims, database::Database, middleware::optional_auth::MaybeClaims};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Article {
    pub id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub slug: String,
    pub author_id: String,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ArticleQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    #[serde(rename = "authorId")]
    pub author_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct ArticlesResponse {
    success: bool,
    data: Vec<Article>,
    pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
struct PaginationInfo {
    page: u32,
    limit: u32,
    total: usize,
    pages: u32,
}

#[derive(Debug, Serialize)]
struct ArticleCounts {
    likes: i64,
    comments: i64,
}

#[derive(Debug, Serialize)]
struct ArticleCommentUser {
    id: String,
    name: Option<String>,
    username: Option<String>,
    avatar: Option<String>,
}

#[derive(Debug, Serialize)]
struct ArticleComment {
    id: Uuid,
    content: String,
    #[serde(rename = "createdAt")]
    created_at: chrono::DateTime<chrono::Utc>,
    user: ArticleCommentUser,
}

#[derive(Debug, Deserialize)]
struct CreateArticleRequest {
    pub title: String,
    pub content: String,
    pub slug: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateCommentRequest {
    content: String,
}

pub fn articles_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_articles).post(create_article))
        .route("/:slug", get(get_article_by_slug))
        .route("/:id/like", post(toggle_article_like))
        .route(
            "/:id/comments",
            get(get_article_comments).post(create_article_comment),
        )
}

async fn get_articles(
    State(db): State<Database>,
    Query(params): Query<ArticleQuery>,
) -> Result<ResponseJson<ArticlesResponse>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let total_count = if let Some(author_id) = &params.author_id {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM articles WHERE author_id = $1")
            .bind(author_id)
            .fetch_one(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM articles")
            .fetch_one(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    let articles = if let Some(author_id) = &params.author_id {
        sqlx::query_as::<_, Article>(
            "SELECT * FROM articles WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(author_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        sqlx::query_as::<_, Article>(
            "SELECT * FROM articles ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    let total = total_count as usize;
    let response = ArticlesResponse {
        success: true,
        data: articles,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages: calculate_total_pages(total, limit),
        },
    };

    Ok(ResponseJson(response))
}

async fn get_article_by_slug(
    State(db): State<Database>,
    Path(slug): Path<String>,
    MaybeClaims(maybe_claims): MaybeClaims,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let row = sqlx::query(
        r#"
        SELECT 
            a.id,
            a.title,
            a.content,
            a.slug,
            a.author_id,
            a.published_at,
            a.created_at,
            a.updated_at,
            COALESCE(l.like_count, 0) AS like_count,
            COALESCE(c.comment_count, 0) AS comment_count,
            COALESCE(u.display_name, u.name, u.username) AS author_name,
            u.username AS author_username,
            u.avatar_url AS author_avatar
        FROM articles a
        LEFT JOIN users u ON u.id = a.author_id
        LEFT JOIN (
            SELECT article_id, COUNT(*) AS like_count
            FROM article_likes
            GROUP BY article_id
        ) l ON l.article_id = a.id
        LEFT JOIN (
            SELECT article_id, COUNT(*) AS comment_count
            FROM article_comments
            GROUP BY article_id
        ) c ON c.article_id = a.id
        WHERE a.slug = $1
        "#,
    )
    .bind(&slug)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    let article_id = row.get::<Uuid, _>("id");
    let has_liked = if let Some(claims) = maybe_claims {
        sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM article_likes WHERE article_id = $1 AND user_id = $2)",
        )
        .bind(article_id)
        .bind(&claims.sub)
        .fetch_one(&db.pool)
        .await
        .unwrap_or(false)
    } else {
        false
    };

    Ok(ResponseJson(json!({
        "id": article_id,
        "title": row.get::<String, _>("title"),
        "content": row.get::<Option<String>, _>("content"),
        "slug": row.get::<String, _>("slug"),
        "author_id": row.get::<String, _>("author_id"),
        "authorName": row.get::<Option<String>, _>("author_name"),
        "authorUsername": row.get::<Option<String>, _>("author_username"),
        "authorAvatar": row.get::<Option<String>, _>("author_avatar"),
        "author": json!({
            "id": row.get::<String, _>("author_id"),
            "name": row.get::<Option<String>, _>("author_name"),
            "username": row.get::<Option<String>, _>("author_username"),
            "avatar": row.get::<Option<String>, _>("author_avatar"),
        }),
        "published_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("published_at"),
        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
        "_count": ArticleCounts {
            likes: row.get::<i64, _>("like_count"),
            comments: row.get::<i64, _>("comment_count")
        },
        "hasLiked": has_liked
    })))
}

async fn create_article(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<CreateArticleRequest>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let author_id = claims.sub;

    let is_creator = sqlx::query_scalar::<_, bool>("SELECT is_creator FROM users WHERE id = $1")
        .bind(&author_id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !is_creator {
        return Err(StatusCode::FORBIDDEN);
    }

    let article_id = Uuid::new_v4();
    let slug = payload.slug.unwrap_or_else(|| {
        payload
            .title
            .to_lowercase()
            .replace(' ', "-")
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "")
    });

    let article = sqlx::query_as::<_, Article>(
        "INSERT INTO articles (id, title, content, slug, author_id, published_at, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
         RETURNING *",
    )
    .bind(article_id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&slug)
    .bind(&author_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("articles_slug_key") => {
            StatusCode::CONFLICT
        }
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    Ok(ResponseJson(json!({
        "success": true,
        "data": article
    })))
}

async fn toggle_article_like(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let article_id = Uuid::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let inserted = sqlx::query(
        r#"
        INSERT INTO article_likes (article_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (article_id, user_id) DO NOTHING
        "#,
    )
    .bind(article_id)
    .bind(&claims.sub)
    .execute(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .rows_affected()
        > 0;

    if !inserted {
        sqlx::query("DELETE FROM article_likes WHERE article_id = $1 AND user_id = $2")
            .bind(article_id)
            .bind(&claims.sub)
            .execute(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let like_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM article_likes WHERE article_id = $1")
            .bind(article_id)
            .fetch_one(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(ResponseJson(json!({
        "success": true,
        "data": {
            "liked": inserted,
            "likeCount": like_count
        }
    })))
}

async fn get_article_comments(
    State(db): State<Database>,
    Path(id_or_slug): Path<String>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    let article_id = match Uuid::parse_str(&id_or_slug) {
        Ok(uuid) => uuid,
        Err(_) => sqlx::query_scalar::<_, Uuid>("SELECT id FROM articles WHERE slug = $1")
            .bind(&id_or_slug)
            .fetch_one(&db.pool)
            .await
            .map_err(|_| StatusCode::NOT_FOUND)?,
    };

    let comments = sqlx::query(
        r#"
        SELECT 
            c.id,
            c.content,
            c.created_at,
            u.id AS user_id,
            u.name AS user_name,
            u.username AS user_username,
            u.avatar AS user_avatar
        FROM article_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.article_id = $1
        ORDER BY c.created_at DESC
        "#,
    )
    .bind(article_id)
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .into_iter()
    .map(|row| ArticleComment {
        id: row.get("id"),
        content: row.get("content"),
        created_at: row.get("created_at"),
        user: ArticleCommentUser {
            id: row.get("user_id"),
            name: row.get("user_name"),
            username: row.get("user_username"),
            avatar: row.get("user_avatar"),
        },
    })
    .collect::<Vec<_>>();

    Ok(ResponseJson(json!({
        "success": true,
        "data": comments
    })))
}

async fn create_article_comment(
    State(db): State<Database>,
    Path(id): Path<String>,
    claims: Claims,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<ResponseJson<serde_json::Value>, StatusCode> {
    if payload.content.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let article_id = Uuid::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let comment = sqlx::query(
        r#"
        INSERT INTO article_comments (article_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
        "#,
    )
    .bind(article_id)
    .bind(&claims.sub)
    .bind(&payload.content)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(ResponseJson(json!({
        "success": true,
        "data": {
            "id": comment.get::<Uuid, _>("id"),
            "content": payload.content,
            "createdAt": comment.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
        }
    })))
}

fn calculate_total_pages(total: usize, limit: u32) -> u32 {
    if limit == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as u32
    }
}
