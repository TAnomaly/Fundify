use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::digital_product::{DigitalProduct, DigitalProductListResponse, Purchase};
use crate::services::digital_product_service::{
    create_product, list_products, list_user_purchases, purchase_product, record_download,
    update_product, DigitalProductInput, DigitalProductUpdateInput, ProductListFilters,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route(
            "/digital-products",
            get(handle_list_products).post(handle_create_product),
        )
        .route(
            "/digital-products/:id",
            get(handle_get_product).put(handle_update_product),
        )
        .route(
            "/digital-products/:id/purchase",
            post(handle_purchase_product),
        )
        .route(
            "/digital-products/:id/download",
            post(handle_record_download),
        )
        .route(
            "/digital-products/purchases/my",
            get(handle_list_my_purchases),
        )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProductQuery {
    creator_id: Option<Uuid>,
    product_type: Option<String>,
    is_active: Option<bool>,
    is_featured: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct ProductRequest {
    #[validate(length(min = 3, max = 160))]
    title: String,
    #[serde(default)]
    #[validate(length(max = 5000))]
    description: Option<String>,
    product_type: String,
    price_cents: i32,
    #[serde(default)]
    #[validate(url)]
    file_url: Option<String>,
    #[serde(default)]
    file_size: Option<i64>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    #[validate(url)]
    preview_url: Option<String>,
    #[serde(default)]
    features: Vec<String>,
    #[serde(default)]
    requirements: Vec<String>,
    #[serde(default = "default_true")]
    is_active: bool,
    #[serde(default)]
    is_featured: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct ProductUpdateRequest {
    #[serde(default)]
    #[validate(length(min = 3, max = 160))]
    title: Option<String>,
    #[serde(default)]
    #[validate(length(max = 5000))]
    description: Option<String>,
    #[serde(default)]
    product_type: Option<String>,
    #[serde(default)]
    price_cents: Option<i32>,
    #[serde(default)]
    #[validate(url)]
    file_url: Option<String>,
    #[serde(default)]
    file_size: Option<i64>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    #[validate(url)]
    preview_url: Option<String>,
    #[serde(default)]
    features: Option<Vec<String>>,
    #[serde(default)]
    requirements: Option<Vec<String>>,
    #[serde(default)]
    is_active: Option<bool>,
    #[serde(default)]
    is_featured: Option<bool>,
}

async fn handle_list_products(
    State(state): State<SharedState>,
    Query(query): Query<ProductQuery>,
) -> Result<Json<DigitalProductListResponse>, AppError> {
    let filters = ProductListFilters {
        creator_id: query.creator_id,
        product_type: query.product_type.map(|t| t.to_ascii_uppercase()),
        is_active: query.is_active,
        is_featured: query.is_featured,
    };

    let products = list_products(&state, filters).await?;
    Ok(Json(products))
}

async fn handle_get_product(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Json<DigitalProduct>, AppError> {
    let product = crate::services::digital_product_service::get_product(&state, id).await?;
    Ok(Json(product))
}

async fn handle_create_product(
    State(state): State<SharedState>,
    AuthUser { id: creator_id, .. }: AuthUser,
    Json(body): Json<ProductRequest>,
) -> Result<Json<DigitalProduct>, AppError> {
    body.validate()?;

    let input = DigitalProductInput {
        title: body.title,
        description: body.description,
        product_type: body.product_type.to_ascii_uppercase(),
        price_cents: body.price_cents,
        file_url: body.file_url,
        file_size: body.file_size,
        cover_image: body.cover_image,
        preview_url: body.preview_url,
        features: body.features,
        requirements: body.requirements,
        is_active: body.is_active,
        is_featured: body.is_featured,
    };

    let product = create_product(&state, creator_id, input).await?;
    Ok(Json(product))
}

async fn handle_update_product(
    State(state): State<SharedState>,
    AuthUser { id: creator_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<ProductUpdateRequest>,
) -> Result<Json<DigitalProduct>, AppError> {
    body.validate()?;

    let input = DigitalProductUpdateInput {
        title: body.title,
        description: body.description,
        product_type: body.product_type.map(|t| t.to_ascii_uppercase()),
        price_cents: body.price_cents,
        file_url: body.file_url.map(Some),
        file_size: body.file_size.map(Some),
        cover_image: body.cover_image.map(Some),
        preview_url: body.preview_url.map(Some),
        features: body.features,
        requirements: body.requirements,
        is_active: body.is_active,
        is_featured: body.is_featured,
    };

    let product = update_product(&state, id, creator_id, input).await?;
    Ok(Json(product))
}

async fn handle_purchase_product(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Purchase>, AppError> {
    let purchase = purchase_product(&state, id, user_id).await?;
    Ok(Json(purchase))
}

async fn handle_record_download(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Purchase>, AppError> {
    let purchase = record_download(&state, id, user_id).await?;
    Ok(Json(purchase))
}

async fn handle_list_my_purchases(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<Vec<Purchase>>, AppError> {
    let purchases = list_user_purchases(&state, user_id).await?;
    Ok(Json(purchases))
}
