use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;

use crate::utils::{app_state::AppState, error::AppResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub currency: String,
    pub category: String,
    pub creator_id: String,
    pub creator_name: String,
    pub creator_username: String,
    pub image_url: Option<String>,
    pub download_url: Option<String>,
    pub is_digital: bool,
    pub tags: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductCollection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub image_url: Option<String>,
    pub product_count: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductsListResponse {
    pub success: bool,
    pub data: ProductsData,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductsData {
    pub products: Vec<Product>,
    pub total: i64,
    pub page: i32,
    pub limit: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CollectionsResponse {
    pub success: bool,
    pub data: Vec<ProductCollection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductMetaResponse {
    pub success: bool,
    pub data: ProductMeta,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductMeta {
    pub total_products: i64,
    pub total_collections: i64,
    pub categories: Vec<String>,
    pub price_range: PriceRange,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceRange {
    pub min: f64,
    pub max: f64,
}

// List products with optional filtering
pub async fn list_products(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<Json<ProductsListResponse>> {
    let page = params
        .get("page")
        .and_then(|p| p.parse::<i32>().ok())
        .unwrap_or(1);
    let limit = params
        .get("limit")
        .and_then(|l| l.parse::<i32>().ok())
        .unwrap_or(20);
    let sort = params.get("sort").unwrap_or(&"created_at".to_string());
    let category = params.get("category");
    let search = params.get("search");

    let offset = (page - 1) * limit;

    // Query DigitalProduct table
    let query = r#"
        SELECT 
            dp.id,
            dp.title,
            dp.description,
            dp.price,
            'USD' as currency,
            dp."productType"::text as category,
            dp."creatorId" as creator_id,
            u.name as creator_name,
            u.username as creator_username,
            dp."coverImage" as image_url,
            dp."fileUrl" as download_url,
            true as is_digital,
            dp.features as tags,
            dp."createdAt" as created_at,
            dp."updatedAt" as updated_at
        FROM "DigitalProduct" dp
        JOIN "User" u ON dp."creatorId" = u.id
        WHERE dp."isActive" = true
        ORDER BY dp."isFeatured" DESC, dp."salesCount" DESC, dp."createdAt" DESC
        LIMIT $1 OFFSET $2
    "#;

    let rows = sqlx::query(query)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?;

    let products: Vec<Product> = rows
        .into_iter()
        .map(|row| Product {
            id: row.get("id"),
            title: row.get("title"),
            description: row.get("description"),
            price: row.get("price"),
            currency: row.get("currency"),
            category: row.get("category"),
            creator_id: row.get("creator_id"),
            creator_name: row.get("creator_name"),
            creator_username: row.try_get("creator_username").unwrap_or_else(|_| "unknown".to_string()),
            image_url: row.get("image_url"),
            download_url: row.get("download_url"),
            is_digital: row.get("is_digital"),
            tags: row.try_get::<Vec<String>, _>("tags").unwrap_or_else(|_| Vec::new()),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    // Get total count
    let count_query = r#"
        SELECT COUNT(*) as total
        FROM "Product" p
        JOIN "User" u ON p.creator_id = u.id
        WHERE 1=1
    "#;

    let total_row = sqlx::query(count_query).fetch_one(&state.db).await?;
    let total: i64 = total_row.get("total");

    Ok(Json(ProductsListResponse {
        success: true,
        data: ProductsData {
            products,
            total,
            page,
            limit,
        },
    }))
}

// Get product collections
pub async fn get_collections(
    State(state): State<AppState>,
) -> AppResult<Json<CollectionsResponse>> {
    // For now, return empty collections since we don't have a ProductCollection table
    // In the future, this could be implemented with a separate collections system
    let collections: Vec<ProductCollection> = vec![];

    Ok(Json(CollectionsResponse {
        success: true,
        data: collections,
    }))
}

// Get product metadata
pub async fn get_meta(
    State(state): State<AppState>,
) -> AppResult<Json<ProductMetaResponse>> {
    // Get total products
    let total_products_row = sqlx::query("SELECT COUNT(*) as total FROM \"DigitalProduct\" WHERE \"isActive\" = true")
        .fetch_one(&state.db)
        .await?;
    let total_products: i64 = total_products_row.get("total");

    // Get categories
    let category_rows = sqlx::query("SELECT DISTINCT \"productType\"::text FROM \"DigitalProduct\" WHERE \"isActive\" = true AND \"productType\" IS NOT NULL")
        .fetch_all(&state.db)
        .await?;
    let categories: Vec<String> = category_rows
        .into_iter()
        .map(|row| row.get("productType"))
        .collect();

    // Get price range
    let price_row = sqlx::query("SELECT MIN(price) as min_price, MAX(price) as max_price FROM \"DigitalProduct\" WHERE \"isActive\" = true")
        .fetch_one(&state.db)
        .await?;
    let min_price: f64 = price_row.get("min_price");
    let max_price: f64 = price_row.get("max_price");

    Ok(Json(ProductMetaResponse {
        success: true,
        data: ProductMeta {
            total_products,
            total_collections: 0, // No collections table yet
            categories,
            price_range: PriceRange {
                min: min_price,
                max: max_price,
            },
        },
    }))
}
