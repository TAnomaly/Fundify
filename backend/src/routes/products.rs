use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::error;
use uuid::Uuid;

use crate::{
    auth::Claims,
    database::Database,
    models::{CreateProductRequest, Product, Purchase},
};

#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub user_id: Option<String>,
    pub creatorId: Option<String>,
}

pub fn product_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_products).post(create_product))
        .route("/me", get(get_my_products))
        .route("/meta", get(get_products_meta))
        .route("/collections", get(get_products_collections))
        .route("/:id", get(get_product_by_id))
        .route("/:id", put(update_product))
        .route("/:id", delete(delete_product))
        .route("/:id/purchase", post(purchase_product))
        .route("/:id/download", get(get_product_download))
}

async fn get_products(
    State(db): State<Database>,
    Query(params): Query<ProductQuery>,
) -> Result<Json<Vec<Product>>, StatusCode> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let offset = (page - 1) * limit;
    let limit_i64 = limit as i64;
    let offset_i64 = offset as i64;

    let products = if let Some(creator_id) = params.creatorId.clone() {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(&creator_id)
        .bind(limit_i64)
        .bind(offset_i64)
        .fetch_all(&db.pool)
        .await
    } else if let Some(user_id) = params.user_id.clone() {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(&user_id)
        .bind(limit_i64)
        .bind(offset_i64)
        .fetch_all(&db.pool)
        .await
    } else {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit_i64)
        .bind(offset_i64)
        .fetch_all(&db.pool)
        .await
    }
    .map_err(|e| {
        eprintln!("Error fetching products: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(products))
}

async fn create_product(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<CreateProductRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = claims.sub;

    if payload.name.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let currency = payload
        .currency
        .clone()
        .unwrap_or_else(|| "USD".to_string());

    let is_digital = payload
        .is_digital
        .unwrap_or_else(|| match payload.product_type.as_deref() {
            Some(product_type) if product_type.eq_ignore_ascii_case("physical") => false,
            _ => true,
        });

    let product = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO products (user_id, name, description, price, currency, image_url, is_digital, download_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#
    )
    .bind(&user_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.price)
    .bind(currency)
    .bind(&payload.image_url)
    .bind(is_digital)
    .bind(&payload.download_url)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": product
    })))
}

async fn get_my_products(
    State(db): State<Database>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let products = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(&claims.sub)
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": products
    })))
}

async fn get_product_by_id(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
) -> Result<Json<Product>, StatusCode> {
    let product = sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = $1")
        .bind(id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(product))
}

async fn update_product(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(payload): Json<CreateProductRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user_id = claims.sub;

    // Check if user owns the product
    let existing_product =
        sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(&user_id)
            .fetch_optional(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_product.is_none() {
        return Err(StatusCode::FORBIDDEN);
    }

    if payload.name.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let currency = payload
        .currency
        .clone()
        .unwrap_or_else(|| "USD".to_string());

    let is_digital = payload
        .is_digital
        .unwrap_or_else(|| match payload.product_type.as_deref() {
            Some(product_type) if product_type.eq_ignore_ascii_case("physical") => false,
            _ => true,
        });

    let product = sqlx::query_as::<_, Product>(
        r#"
        UPDATE products 
        SET name = $2, description = $3, price = $4, currency = $5, image_url = $6, is_digital = $7, download_url = $8, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.price)
    .bind(currency)
    .bind(&payload.image_url)
    .bind(is_digital)
    .bind(&payload.download_url)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": product
    })))
}

async fn delete_product(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<StatusCode, StatusCode> {
    let user_id = claims.sub;

    // Check if user owns the product
    let existing_product =
        sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(&user_id)
            .fetch_optional(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_product.is_none() {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(id)
        .execute(&db.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PurchaseProductRequest {
    payment_method: Option<String>,
    transaction_id: Option<String>,
}

async fn purchase_product(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
    Json(_payload): Json<PurchaseProductRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let product = sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = $1")
        .bind(id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if product.price <= 0.0 {
        let purchase = sqlx::query_as::<_, Purchase>(
            r#"
            INSERT INTO purchases (user_id, product_id, amount, currency, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(&claims.sub)
        .bind(id)
        .bind(product.price)
        .bind(&product.currency)
        .bind("COMPLETED")
        .fetch_one(&db.pool)
        .await
        .map_err(|error| {
            error!("Failed to create free purchase: {:?}", error);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        return Ok(Json(json!({
            "success": true,
            "data": {
                "purchaseId": purchase.id,
                "status": purchase.status,
                "productId": purchase.product_id,
                "amount": purchase.amount,
                "currency": purchase.currency,
            }
        })));
    }

    let stripe_secret =
        std::env::var("STRIPE_SECRET_KEY").map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if stripe_secret.trim().is_empty() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let success_url = format!(
        "{}/products/{}?session_id={{CHECKOUT_SESSION_ID}}",
        frontend_url, product.id
    );
    let cancel_url = format!("{}/products/{}?cancelled=true", frontend_url, product.id);

    let amount_cents = (product.price * 100.0).round() as i64;
    if amount_cents <= 0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut form_data = vec![
        ("mode".to_string(), "payment".to_string()),
        ("success_url".to_string(), success_url),
        ("cancel_url".to_string(), cancel_url),
        (
            "line_items[0][price_data][currency]".to_string(),
            product.currency.to_lowercase(),
        ),
        (
            "line_items[0][price_data][product_data][name]".to_string(),
            product.name.clone(),
        ),
        (
            "line_items[0][price_data][unit_amount]".to_string(),
            amount_cents.to_string(),
        ),
        ("line_items[0][quantity]".to_string(), "1".to_string()),
        ("payment_method_types[0]".to_string(), "card".to_string()),
        ("metadata[user_id]".to_string(), claims.sub.clone()),
        ("metadata[product_id]".to_string(), product.id.to_string()),
    ];

    if let Some(description) = &product.description {
        if !description.trim().is_empty() {
            form_data.push((
                "line_items[0][price_data][product_data][description]".to_string(),
                description.clone(),
            ));
        }
    }

    if let Some(image_url) = &product.image_url {
        if !image_url.trim().is_empty() {
            form_data.push((
                "line_items[0][price_data][product_data][images][0]".to_string(),
                image_url.clone(),
            ));
        }
    }

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.stripe.com/v1/checkout/sessions")
        .header("Authorization", format!("Bearer {}", stripe_secret))
        .form(&form_data)
        .send()
        .await
        .map_err(|error| {
            error!("Failed to create Stripe checkout session: {:?}", error);
            StatusCode::BAD_GATEWAY
        })?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        error!(
            "Stripe checkout session creation failed with status {}: {}",
            status, body
        );
        return Err(StatusCode::BAD_GATEWAY);
    }

    let session: serde_json::Value = response.json().await.map_err(|error| {
        error!(
            "Failed to parse Stripe checkout session response: {:?}",
            error
        );
        StatusCode::BAD_GATEWAY
    })?;

    let checkout_url = session
        .get("url")
        .and_then(|value| value.as_str())
        .map(str::to_string)
        .ok_or(StatusCode::BAD_GATEWAY)?;

    let session_id = session
        .get("id")
        .and_then(|value| value.as_str())
        .map(str::to_string)
        .ok_or(StatusCode::BAD_GATEWAY)?;

    let payment_intent_id = session
        .get("payment_intent")
        .and_then(|value| value.as_str())
        .map(str::to_string);

    let purchase = sqlx::query_as::<_, Purchase>(
        r#"
        INSERT INTO purchases (
            user_id,
            product_id,
            stripe_payment_intent_id,
            stripe_checkout_session_id,
            amount,
            currency,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(&claims.sub)
    .bind(id)
    .bind(payment_intent_id.clone())
    .bind(Some(session_id.clone()))
    .bind(product.price)
    .bind(&product.currency)
    .bind("PENDING")
    .fetch_one(&db.pool)
    .await
    .map_err(|error| {
        error!("Failed to store purchase record: {:?}", error);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "purchaseId": purchase.id,
            "status": purchase.status,
            "checkoutUrl": checkout_url,
            "productId": purchase.product_id,
            "amount": purchase.amount,
            "currency": purchase.currency,
            "stripeSessionId": session_id,
            "stripePaymentIntentId": payment_intent_id
        }
    })))
}

async fn get_product_download(
    State(db): State<Database>,
    Path(id): Path<Uuid>,
    claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let product = sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = $1")
        .bind(id)
        .fetch_one(&db.pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if !product.is_digital {
        return Err(StatusCode::BAD_REQUEST);
    }

    let download_url = product
        .download_url
        .clone()
        .filter(|url| !url.trim().is_empty())
        .ok_or(StatusCode::NOT_FOUND)?;

    let is_owner = product.user_id == claims.sub;

    if !is_owner {
        let purchase = sqlx::query_as::<_, Purchase>(
            r#"
            SELECT *
            FROM purchases
            WHERE product_id = $1
              AND user_id = $2
              AND UPPER(status) = 'COMPLETED'
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(id)
        .bind(&claims.sub)
        .fetch_optional(&db.pool)
        .await
        .map_err(|error| {
            error!("Failed to validate purchase for download: {:?}", error);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        if purchase.is_none() {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    let file_name = download_url
        .split('/')
        .last()
        .unwrap_or("download")
        .to_string();

    Ok(Json(json!({
        "success": true,
        "data": {
            "fileUrl": download_url,
            "fileName": file_name
        }
    })))
}

#[derive(Debug, Serialize)]
struct ProductMeta {
    types: Vec<TypeCount>,
    price_range: PriceRange,
    stats: ProductStats,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct TypeCount {
    r#type: String,
    count: i64,
}

#[derive(Debug, Serialize)]
struct PriceRange {
    min: f64,
    max: f64,
}

#[derive(Debug, Serialize)]
struct ProductStats {
    total_products: i64,
    featured_count: i64,
    creator_count: i64,
    total_revenue: f64,
}

async fn get_products_meta(
    State(db): State<Database>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Get product types and counts
    let types = sqlx::query_as::<_, TypeCount>(
        "SELECT 'DIGITAL' as type, COUNT(*) as count FROM products WHERE is_digital = true",
    )
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get price range
    let price_range = sqlx::query_as::<_, (Option<f64>, Option<f64>)>(
        "SELECT MIN(price), MAX(price) FROM products",
    )
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get stats
    let stats = sqlx::query_as::<_, (i64, i64, i64, f64)>(
        "SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN is_digital = true THEN 1 END) as featured_count,
            COUNT(DISTINCT user_id) as creator_count,
            COALESCE(SUM(price), 0) as total_revenue
         FROM products",
    )
    .fetch_one(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = serde_json::json!({
        "success": true,
        "data": {
            "types": types,
            "priceRange": {
                "min": price_range.0.unwrap_or(0.0),
                "max": price_range.1.unwrap_or(0.0)
            },
            "stats": {
                "totalProducts": stats.0,
                "featuredCount": stats.1,
                "creatorCount": stats.2,
                "totalRevenue": stats.3
            }
        }
    });

    Ok(Json(response))
}

#[derive(Debug, Serialize)]
struct ProductCollections {
    featured: Vec<Product>,
    top_selling: Vec<Product>,
    new_arrivals: Vec<Product>,
}

async fn get_products_collections(
    State(db): State<Database>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Get featured products (digital products)
    let featured = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE is_digital = true ORDER BY created_at DESC LIMIT 6",
    )
    .fetch_all(&db.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get top selling products (by price, as we don't have sales data)
    let top_selling =
        sqlx::query_as::<_, Product>("SELECT * FROM products ORDER BY price DESC LIMIT 6")
            .fetch_all(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get new arrivals
    let new_arrivals =
        sqlx::query_as::<_, Product>("SELECT * FROM products ORDER BY created_at DESC LIMIT 6")
            .fetch_all(&db.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = serde_json::json!({
        "success": true,
        "data": {
            "featured": featured,
            "topSelling": top_selling,
            "newArrivals": new_arrivals
        }
    });

    Ok(Json(response))
}
