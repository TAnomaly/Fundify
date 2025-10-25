use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::Database;

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
    Router::new()
        .route("/", get(get_articles))
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
            "SELECT * FROM articles ORDER BY created_at DESC LIMIT $1 OFFSET $2"
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

    let total = articles.len();
    let response = ArticlesResponse {
        success: true,
        data: articles,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages: 1,
        },
    };
    Ok(Json(response))
}

async fn get_article_by_slug(
    State(db): State<Database>,
    Path(slug): Path<String>,
) -> Result<Json<Article>, StatusCode> {
    let article = sqlx::query_as::<_, Article>(
        "SELECT * FROM articles WHERE slug = $1"
    )
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
    axum::extract::Json(payload): axum::extract::Json<CreateArticleRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    println!("🔄 Creating new article: {}", payload.title);
    
    let article_id = Uuid::new_v4();
    let slug = payload.slug.unwrap_or_else(|| {
        payload.title
            .to_lowercase()
            .replace(' ', "-")
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "")
    });
    
    let result = sqlx::query(
        "INSERT INTO articles (id, title, content, slug, author_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())"
    )
    .bind(article_id)
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&slug)
    .bind("test-creator-123") // For now, use test creator ID
    .execute(&db.pool)
    .await
    .map_err(|e| {
        println!("❌ Error creating article: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    println!("✅ Article created successfully. Rows affected: {}", result.rows_affected());
    
    let response = serde_json::json!({
        "success": true,
        "message": "Article created successfully",
        "articleId": article_id,
        "slug": slug
    });
    
    Ok(Json(response))
}
