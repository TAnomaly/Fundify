use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use crate::database::Database;

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub limit: Option<u32>,
    #[serde(rename = "type")]
    pub search_type: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    result_type: String,
    id: String,
    title: String,
    description: Option<String>,
    image: Option<String>,
    creator_name: Option<String>,
}

pub fn search_routes() -> Router<Database> {
    Router::new().route("/", get(search))
}

async fn search(
    State(db): State<Database>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let query = format!("%{}%", params.q);
    let limit = params.limit.unwrap_or(20) as i64;
    let search_type = params.search_type.as_deref().unwrap_or("all");

    let mut results = Vec::new();

    // Search posts
    if search_type == "all" || search_type == "posts" {
        let posts = sqlx::query(
            r#"
            SELECT 
                p.id,
                p.title,
                p.content as description,
                NULL as image,
                u.username as creator_name
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.title ILIKE $1 OR p.content ILIKE $1
            ORDER BY p.created_at DESC
            LIMIT $2
            "#
        )
        .bind(&query)
        .bind(limit)
        .fetch_all(&db.pool)
        .await
        .unwrap_or_default();

        for row in posts {
            results.push(SearchResult {
                result_type: "post".to_string(),
                id: row.get::<Uuid, _>("id").to_string(),
                title: row.get("title"),
                description: row.try_get("description").ok(),
                image: None,
                creator_name: row.try_get("creator_name").ok(),
            });
        }
    }

    // Search creators
    if search_type == "all" || search_type == "creators" {
        let creators = sqlx::query(
            r#"
            SELECT 
                id,
                username as title,
                bio as description,
                avatar_url as image
            FROM users
            WHERE is_creator = true
            AND (username ILIKE $1 OR name ILIKE $1 OR bio ILIKE $1)
            ORDER BY username
            LIMIT $2
            "#
        )
        .bind(&query)
        .bind(limit)
        .fetch_all(&db.pool)
        .await
        .unwrap_or_default();

        for row in creators {
            results.push(SearchResult {
                result_type: "creator".to_string(),
                id: row.get("id"),
                title: row.get("title"),
                description: row.try_get("description").ok(),
                image: row.try_get("image").ok(),
                creator_name: None,
            });
        }
    }

    // Search products
    if search_type == "all" || search_type == "products" {
        let products = sqlx::query(
            r#"
            SELECT 
                pr.id,
                pr.name as title,
                pr.description,
                pr.image_url as image,
                u.username as creator_name
            FROM products pr
            LEFT JOIN users u ON pr.user_id = u.id
            WHERE pr.name ILIKE $1 OR pr.description ILIKE $1
            ORDER BY pr.created_at DESC
            LIMIT $2
            "#
        )
        .bind(&query)
        .bind(limit)
        .fetch_all(&db.pool)
        .await
        .unwrap_or_default();

        for row in products {
            results.push(SearchResult {
                result_type: "product".to_string(),
                id: row.get::<Uuid, _>("id").to_string(),
                title: row.get("title"),
                description: row.try_get("description").ok(),
                image: row.try_get("image").ok(),
                creator_name: row.try_get("creator_name").ok(),
            });
        }
    }

    // Search podcasts
    if search_type == "all" || search_type == "podcasts" {
        let podcasts = sqlx::query(
            r#"
            SELECT 
                p.id,
                p.title,
                p.description,
                p.cover_image as image,
                u.username as creator_name
            FROM podcasts p
            LEFT JOIN users u ON p.creator_id = u.id
            WHERE p.title ILIKE $1 OR p.description ILIKE $1
            ORDER BY p.created_at DESC
            LIMIT $2
            "#
        )
        .bind(&query)
        .bind(limit)
        .fetch_all(&db.pool)
        .await
        .unwrap_or_default();

        for row in podcasts {
            results.push(SearchResult {
                result_type: "podcast".to_string(),
                id: row.get::<Uuid, _>("id").to_string(),
                title: row.get("title"),
                description: row.try_get("description").ok(),
                image: row.try_get("image").ok(),
                creator_name: row.try_get("creator_name").ok(),
            });
        }
    }

    Ok(Json(json!({
        "success": true,
        "data": {
            "results": results,
            "query": params.q,
            "total": results.len()
        }
    })))
}
