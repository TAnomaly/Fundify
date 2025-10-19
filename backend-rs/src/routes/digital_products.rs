use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    error::AppError,
    models::{
        digital_product::{
            CreateDigitalProductRequest, DigitalProductWithRelations, DownloadProductResponse,
            ProductCollectionsResponse, ProductMetaResponse, PurchaseProductRequest,
            PurchaseWithProduct, UpdateDigitalProductRequest,
        },
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct GetAllProductsQuery {
    pub r#type: Option<String>,
    pub types: Option<String>,
    pub featured: Option<bool>,
    pub creator_id: Option<Uuid>,
    pub search: Option<String>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub sort: Option<String>,
}

pub fn digital_products_router() -> Router<AppState> {
    Router::new()
        .route("/products", get(get_all_products))
        .route("/products/me", get(get_creator_products))
        .route("/products/meta", get(get_product_meta))
        .route("/products/collections", get(get_product_collections))
        .route("/products/:id", get(get_product_by_id))
        .route("/products", post(create_product))
        .route("/products/:id", put(update_product))
        .route("/products/:id", delete(delete_product))
        .route("/products/:id/purchase", post(purchase_product))
        .route("/purchases/me", get(get_my_purchases))
        .route("/products/:id/download", get(download_product))
}

// GET /api/products - Get all active products (public)
pub async fn get_all_products(
    State(state): State<AppState>,
    Query(query): Query<GetAllProductsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut where_clause = "is_active = true".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![];
    let mut param_count = 0;

    // Type filter
    if let Some(product_type) = query.r#type {
        param_count += 1;
        where_clause.push_str(&format!(" AND product_type = ${}", param_count));
        params.push(Box::new(product_type));
    }

    // Featured filter
    if let Some(featured) = query.featured {
        param_count += 1;
        where_clause.push_str(&format!(" AND is_featured = ${}", param_count));
        params.push(Box::new(featured));
    }

    // Creator filter
    if let Some(creator_id) = query.creator_id {
        param_count += 1;
        where_clause.push_str(&format!(" AND creator_id = ${}", param_count));
        params.push(Box::new(creator_id));
    }

    // Search filter
    if let Some(search) = query.search {
        param_count += 1;
        where_clause.push_str(&format!(" AND (title ILIKE ${} OR description ILIKE ${})", param_count, param_count));
        params.push(Box::new(format!("%{}%", search)));
    }

    // Price range filter
    if let Some(min_price) = query.min_price {
        param_count += 1;
        where_clause.push_str(&format!(" AND price >= ${}", param_count));
        params.push(Box::new(min_price));
    }
    if let Some(max_price) = query.max_price {
        param_count += 1;
        where_clause.push_str(&format!(" AND price <= ${}", param_count));
        params.push(Box::new(max_price));
    }

    // Sort options
    let order_by = match query.sort.as_deref() {
        Some("price_asc") => "ORDER BY price ASC",
        Some("price_desc") => "ORDER BY price DESC",
        Some("new") => "ORDER BY created_at DESC",
        Some("featured") => "ORDER BY is_featured DESC, created_at DESC",
        Some("sales") => "ORDER BY sales_count DESC",
        Some("popular") => "ORDER BY is_featured DESC, sales_count DESC, created_at DESC",
        _ => "ORDER BY is_featured DESC, sales_count DESC, created_at DESC",
    };

    let products = sqlx::query_as!(
        DigitalProductWithRelations,
        &format!(
            r#"
            SELECT 
                dp.id, dp.title, dp.description, dp.price, dp.product_type, dp.file_url, 
                dp.file_size::text as file_size, dp.cover_image, dp.preview_url, dp.features, 
                dp.requirements, dp.is_active, dp.is_featured, dp.sales_count, dp.revenue, 
                dp.creator_id, dp.created_at, dp.updated_at,
                u.id as creator_id, u.name as creator_name, u.username as creator_username, 
                u.avatar as creator_avatar, u.bio as creator_bio, u.is_creator as creator_is_creator,
                COUNT(p.id) as purchase_count
            FROM digital_products dp
            LEFT JOIN users u ON dp.creator_id = u.id
            LEFT JOIN purchases p ON dp.id = p.product_id
            WHERE {}
            GROUP BY dp.id, u.id
            {}
            "#,
            where_clause, order_by
        )
    )
    .bind(&*params[0])
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": products
    })))
}

// GET /api/products/:id - Get single product by ID
pub async fn get_product_by_id(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let product = sqlx::query_as!(
        DigitalProductWithRelations,
        r#"
        SELECT 
            dp.id, dp.title, dp.description, dp.price, dp.product_type, dp.file_url, 
            dp.file_size::text as file_size, dp.cover_image, dp.preview_url, dp.features, 
            dp.requirements, dp.is_active, dp.is_featured, dp.sales_count, dp.revenue, 
            dp.creator_id, dp.created_at, dp.updated_at,
            u.id as creator_id, u.name as creator_name, u.username as creator_username, 
            u.avatar as creator_avatar, u.bio as creator_bio, u.is_creator as creator_is_creator,
            COUNT(p.id) as purchase_count
        FROM digital_products dp
        LEFT JOIN users u ON dp.creator_id = u.id
        LEFT JOIN purchases p ON dp.id = p.product_id
        WHERE dp.id = $1
        GROUP BY dp.id, u.id
        "#,
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let product = product.ok_or(AppError::NotFound("Product not found".to_string()))?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": product
    })))
}

// GET /api/products/me - Get creator's products
pub async fn get_creator_products(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let products = sqlx::query_as!(
        DigitalProductWithRelations,
        r#"
        SELECT 
            dp.id, dp.title, dp.description, dp.price, dp.product_type, dp.file_url, 
            dp.file_size::text as file_size, dp.cover_image, dp.preview_url, dp.features, 
            dp.requirements, dp.is_active, dp.is_featured, dp.sales_count, dp.revenue, 
            dp.creator_id, dp.created_at, dp.updated_at,
            u.id as creator_id, u.name as creator_name, u.username as creator_username, 
            u.avatar as creator_avatar, u.bio as creator_bio, u.is_creator as creator_is_creator,
            COUNT(p.id) as purchase_count
        FROM digital_products dp
        LEFT JOIN users u ON dp.creator_id = u.id
        LEFT JOIN purchases p ON dp.id = p.product_id
        WHERE dp.creator_id = $1
        GROUP BY dp.id, u.id
        ORDER BY dp.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": products
    })))
}

// POST /api/products - Create product (creators only)
pub async fn create_product(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateDigitalProductRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Verify user is a creator
    let user = sqlx::query!(
        "SELECT is_creator FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.pool)
    .await?;

    let user = user.ok_or(AppError::NotFound("User not found".to_string()))?;
    if !user.is_creator {
        return Err(AppError::Forbidden("Only creators can create products".to_string()));
    }

    // Validate required fields
    if payload.title.is_empty() || payload.product_type.is_empty() {
        return Err(AppError::BadRequest(
            "Title and product type are required".to_string(),
        ));
    }

    let product = sqlx::query_as!(
        DigitalProductWithRelations,
        r#"
        INSERT INTO digital_products (
            id, title, description, price, product_type, file_url, file_size,
            cover_image, preview_url, features, requirements, creator_id,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING 
            id, title, description, price, product_type, file_url, 
            file_size::text as file_size, cover_image, preview_url, features, 
            requirements, is_active, is_featured, sales_count, revenue, 
            creator_id, created_at, updated_at,
            NULL as creator_id, NULL as creator_name, NULL as creator_username, 
            NULL as creator_avatar, NULL as creator_bio, NULL as creator_is_creator,
            0 as purchase_count
        "#,
        Uuid::new_v4(),
        payload.title,
        payload.description,
        payload.price.unwrap_or(0.0),
        payload.product_type,
        payload.file_url,
        payload.file_size,
        payload.cover_image,
        payload.preview_url,
        &payload.features.unwrap_or_default(),
        &payload.requirements.unwrap_or_default(),
        user_id,
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": product,
        "message": "Product created successfully"
    })))
}

// PUT /api/products/:id - Update product
pub async fn update_product(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDigitalProductRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check ownership
    let existing_product = sqlx::query!(
        "SELECT creator_id FROM digital_products WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_product = existing_product.ok_or(AppError::NotFound("Product not found".to_string()))?;

    if existing_product.creator_id != user_id {
        return Err(AppError::Forbidden("You can only edit your own products".to_string()));
    }

    // Build update query dynamically
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<sqlx::Postgres> + Send + Sync + 'static>> = vec![];
    let mut param_count = 0;

    if let Some(title) = payload.title {
        param_count += 1;
        update_fields.push(format!("title = ${}", param_count));
        params.push(Box::new(title));
    }
    if let Some(description) = payload.description {
        param_count += 1;
        update_fields.push(format!("description = ${}", param_count));
        params.push(Box::new(description));
    }
    if let Some(price) = payload.price {
        param_count += 1;
        update_fields.push(format!("price = ${}", param_count));
        params.push(Box::new(price));
    }
    if let Some(product_type) = payload.product_type {
        param_count += 1;
        update_fields.push(format!("product_type = ${}", param_count));
        params.push(Box::new(product_type));
    }
    if let Some(file_url) = payload.file_url {
        param_count += 1;
        update_fields.push(format!("file_url = ${}", param_count));
        params.push(Box::new(file_url));
    }
    if let Some(file_size) = payload.file_size {
        param_count += 1;
        update_fields.push(format!("file_size = ${}", param_count));
        params.push(Box::new(file_size));
    }
    if let Some(cover_image) = payload.cover_image {
        param_count += 1;
        update_fields.push(format!("cover_image = ${}", param_count));
        params.push(Box::new(cover_image));
    }
    if let Some(preview_url) = payload.preview_url {
        param_count += 1;
        update_fields.push(format!("preview_url = ${}", param_count));
        params.push(Box::new(preview_url));
    }
    if let Some(features) = payload.features {
        param_count += 1;
        update_fields.push(format!("features = ${}", param_count));
        params.push(Box::new(features));
    }
    if let Some(requirements) = payload.requirements {
        param_count += 1;
        update_fields.push(format!("requirements = ${}", param_count));
        params.push(Box::new(requirements));
    }
    if let Some(is_active) = payload.is_active {
        param_count += 1;
        update_fields.push(format!("is_active = ${}", param_count));
        params.push(Box::new(is_active));
    }
    if let Some(is_featured) = payload.is_featured {
        param_count += 1;
        update_fields.push(format!("is_featured = ${}", param_count));
        params.push(Box::new(is_featured));
    }

    if update_fields.is_empty() {
        return Err(AppError::BadRequest("No fields to update".to_string()));
    }

    param_count += 1;
    update_fields.push(format!("updated_at = ${}", param_count));
    params.push(Box::new(chrono::Utc::now()));

    param_count += 1;
    params.push(Box::new(id));

    let query = format!(
        "UPDATE digital_products SET {} WHERE id = ${}",
        update_fields.join(", "),
        param_count
    );

    sqlx::query(&query)
        .bind(&*params[0])
        .execute(&state.pool)
        .await?;

    // Fetch updated product
    let updated_product = sqlx::query_as!(
        DigitalProductWithRelations,
        r#"
        SELECT 
            dp.id, dp.title, dp.description, dp.price, dp.product_type, dp.file_url, 
            dp.file_size::text as file_size, dp.cover_image, dp.preview_url, dp.features, 
            dp.requirements, dp.is_active, dp.is_featured, dp.sales_count, dp.revenue, 
            dp.creator_id, dp.created_at, dp.updated_at,
            u.id as creator_id, u.name as creator_name, u.username as creator_username, 
            u.avatar as creator_avatar, u.bio as creator_bio, u.is_creator as creator_is_creator,
            COUNT(p.id) as purchase_count
        FROM digital_products dp
        LEFT JOIN users u ON dp.creator_id = u.id
        LEFT JOIN purchases p ON dp.id = p.product_id
        WHERE dp.id = $1
        GROUP BY dp.id, u.id
        "#,
        id
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": updated_product,
        "message": "Product updated successfully"
    })))
}

// DELETE /api/products/:id - Delete product
pub async fn delete_product(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check ownership
    let existing_product = sqlx::query!(
        "SELECT creator_id FROM digital_products WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let existing_product = existing_product.ok_or(AppError::NotFound("Product not found".to_string()))?;

    if existing_product.creator_id != user_id {
        return Err(AppError::Forbidden("You can only delete your own products".to_string()));
    }

    sqlx::query!("DELETE FROM digital_products WHERE id = $1", id)
        .execute(&state.pool)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Product deleted successfully"
    })))
}

// POST /api/products/:id/purchase - Purchase product
pub async fn purchase_product(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<PurchaseProductRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Check if product exists and is active
    let product = sqlx::query!(
        "SELECT id, price, is_active FROM digital_products WHERE id = $1",
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let product = product.ok_or(AppError::NotFound("Product not found".to_string()))?;

    if !product.is_active {
        return Err(AppError::BadRequest("Product is not available".to_string()));
    }

    // Check if user already purchased
    let existing_purchase = sqlx::query!(
        "SELECT id FROM purchases WHERE user_id = $1 AND product_id = $2 AND status = 'COMPLETED'",
        user_id,
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    if existing_purchase.is_some() {
        return Err(AppError::BadRequest("You already own this product".to_string()));
    }

    // Create purchase
    let purchase = sqlx::query_as!(
        PurchaseWithProduct,
        r#"
        INSERT INTO purchases (
            id, user_id, product_id, amount, status, payment_method, 
            transaction_id, download_count, purchased_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING 
            id, user_id, product_id, amount, status, payment_method, 
            transaction_id, download_count, last_download_at, purchased_at, 
            created_at, updated_at,
            NULL as product_id, NULL as product_title, NULL as product_description,
            NULL as product_price, NULL as product_type, NULL as product_file_url,
            NULL as product_file_size, NULL as product_cover_image, NULL as product_preview_url,
            NULL as product_features, NULL as product_requirements, NULL as product_is_active,
            NULL as product_is_featured, NULL as product_sales_count, NULL as product_revenue,
            NULL as product_creator_id, NULL as product_created_at, NULL as product_updated_at,
            NULL as creator_id, NULL as creator_name, NULL as creator_username,
            NULL as creator_avatar, NULL as creator_bio, NULL as creator_is_creator,
            NULL as purchase_count
        "#,
        Uuid::new_v4(),
        user_id,
        id,
        product.price,
        "COMPLETED",
        payload.payment_method,
        payload.transaction_id,
        0,
        chrono::Utc::now(),
        chrono::Utc::now(),
        chrono::Utc::now()
    )
    .fetch_one(&state.pool)
    .await?;

    // Update product stats
    sqlx::query!(
        "UPDATE digital_products SET sales_count = sales_count + 1, revenue = revenue + $1 WHERE id = $2",
        product.price,
        id
    )
    .execute(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": purchase,
        "message": "Purchase completed successfully"
    })))
}

// GET /api/purchases/me - Get user's purchases
pub async fn get_my_purchases(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    let purchases = sqlx::query_as!(
        PurchaseWithProduct,
        r#"
        SELECT 
            p.id, p.user_id, p.product_id, p.amount, p.status, p.payment_method,
            p.transaction_id, p.download_count, p.last_download_at, p.purchased_at,
            p.created_at, p.updated_at,
            dp.id as product_id, dp.title as product_title, dp.description as product_description,
            dp.price as product_price, dp.product_type as product_type, dp.file_url as product_file_url,
            dp.file_size::text as product_file_size, dp.cover_image as product_cover_image, 
            dp.preview_url as product_preview_url, dp.features as product_features, 
            dp.requirements as product_requirements, dp.is_active as product_is_active,
            dp.is_featured as product_is_featured, dp.sales_count as product_sales_count, 
            dp.revenue as product_revenue, dp.creator_id as product_creator_id, 
            dp.created_at as product_created_at, dp.updated_at as product_updated_at,
            u.id as creator_id, u.name as creator_name, u.username as creator_username,
            u.avatar as creator_avatar, u.bio as creator_bio, u.is_creator as creator_is_creator,
            COUNT(p2.id) as purchase_count
        FROM purchases p
        LEFT JOIN digital_products dp ON p.product_id = dp.id
        LEFT JOIN users u ON dp.creator_id = u.id
        LEFT JOIN purchases p2 ON dp.id = p2.product_id
        WHERE p.user_id = $1
        GROUP BY p.id, dp.id, u.id
        ORDER BY p.purchased_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": purchases
    })))
}

// GET /api/products/meta - Get product metadata
pub async fn get_product_meta(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    // This is a complex query that would need to be implemented with multiple queries
    // For now, return a simplified version
    let total_products = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM digital_products WHERE is_active = true"
    )
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "types": [],
            "price_range": { "min": 0.0, "max": 0.0 },
            "stats": {
                "total_products": total_products.unwrap_or(0),
                "featured_count": 0,
                "creator_count": 0,
                "total_revenue": 0.0
            }
        }
    })))
}

// GET /api/products/collections - Get product collections
pub async fn get_product_collections(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let featured = sqlx::query_as!(
        DigitalProductWithRelations,
        r#"
        SELECT 
            dp.id, dp.title, dp.description, dp.price, dp.product_type, dp.file_url, 
            dp.file_size::text as file_size, dp.cover_image, dp.preview_url, dp.features, 
            dp.requirements, dp.is_active, dp.is_featured, dp.sales_count, dp.revenue, 
            dp.creator_id, dp.created_at, dp.updated_at,
            u.id as creator_id, u.name as creator_name, u.username as creator_username, 
            u.avatar as creator_avatar, u.bio as creator_bio, u.is_creator as creator_is_creator,
            COUNT(p.id) as purchase_count
        FROM digital_products dp
        LEFT JOIN users u ON dp.creator_id = u.id
        LEFT JOIN purchases p ON dp.id = p.product_id
        WHERE dp.is_active = true AND dp.is_featured = true
        GROUP BY dp.id, u.id
        ORDER BY dp.updated_at DESC
        LIMIT 6
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "featured": featured,
            "top_selling": [],
            "new_arrivals": []
        }
    })))
}

// GET /api/products/:id/download - Download product (for purchased users)
pub async fn download_product(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = auth_user.user_id;

    // Verify user purchased the product
    let purchase = sqlx::query!(
        r#"
        SELECT p.id, dp.title, dp.file_url, dp.file_size
        FROM purchases p
        JOIN digital_products dp ON p.product_id = dp.id
        WHERE p.user_id = $1 AND p.product_id = $2 AND p.status = 'COMPLETED'
        "#,
        user_id,
        id
    )
    .fetch_optional(&state.pool)
    .await?;

    let purchase = purchase.ok_or(AppError::Forbidden("You must purchase this product first".to_string()))?;

    // Update download stats
    sqlx::query!(
        "UPDATE purchases SET download_count = download_count + 1, last_download_at = $1 WHERE id = $2",
        chrono::Utc::now(),
        purchase.id
    )
    .execute(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "file_url": purchase.file_url.unwrap_or_default(),
            "file_name": purchase.title,
            "file_size": purchase.file_size.map(|s| s.to_string())
        }
    })))
}
