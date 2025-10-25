use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

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

pub fn article_routes() -> Router<Database> {
    Router::new().route("/", get(get_articles))
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

async fn get_articles(
    State(db): State<Database>,
    Query(params): Query<ArticleQuery>,
) -> Result<Json<ArticlesResponse>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    eprintln!("Articles API called with params: {:?}", params);

    let total_count = if let Some(author_id) = &params.author_id {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM articles WHERE author_id = $1")
            .bind(author_id)
            .fetch_one(&db.pool)
            .await
            .map_err(|e| {
                eprintln!("Error counting articles: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
    } else {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM articles")
            .fetch_one(&db.pool)
            .await
            .map_err(|e| {
                eprintln!("Error counting articles: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
    };

    let articles = if let Some(author_id) = &params.author_id {
        eprintln!("Filtering articles by author_id: {}", author_id);
        sqlx::query_as::<_, Article>(
            "SELECT * FROM articles WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        )
        .bind(author_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error fetching articles: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
    } else {
        sqlx::query_as::<_, Article>(
            "SELECT * FROM articles ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error fetching articles: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
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
    Ok(Json(response))
}

async fn get_article_by_slug(
    State(db): State<Database>,
    Path(slug): Path<String>,
) -> Result<Json<Article>, StatusCode> {
    let article = sqlx::query_as::<_, Article>("SELECT * FROM articles WHERE slug = $1")
        .bind(&slug)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error fetching article by slug: {:?}", e);
            StatusCode::NOT_FOUND
        })?;

    Ok(Json(article))
}

#[derive(Debug, Deserialize)]
pub struct CreateArticleRequest {
    pub title: String,
    pub content: String,
    pub slug: Option<String>,
}

pub fn articles_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_articles).post(create_article))
        .route("/:slug", get(get_article_by_slug))
}

async fn create_article(
    State(db): State<Database>,
    claims: Claims,
    axum::extract::Json(payload): axum::extract::Json<CreateArticleRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let author_id = claims.sub;

    let is_creator = sqlx::query_scalar::<_, bool>("SELECT is_creator FROM users WHERE id = $1")
        .bind(&author_id)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            eprintln!("Error checking creator status for articles: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

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
         RETURNING *"
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
            eprintln!("Duplicate slug detected while creating article: {}", db_err);
            StatusCode::CONFLICT
        }
        _ => {
            eprintln!("Error creating article: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": article
    })))
}

fn calculate_total_pages(total: usize, limit: u32) -> u32 {
    if limit == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as u32
    }
}
