use crate::error::AppError;
use crate::models::digital_product::{DigitalProduct, DigitalProductListResponse, Purchase};
use crate::state::AppState;
use sqlx::QueryBuilder;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ProductListFilters {
    pub creator_id: Option<Uuid>,
    pub product_type: Option<String>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
}

#[derive(Debug, Clone)]
pub struct DigitalProductInput {
    pub title: String,
    pub description: Option<String>,
    pub product_type: String,
    pub price_cents: i32,
    pub file_url: Option<String>,
    pub file_size: Option<i64>,
    pub cover_image: Option<String>,
    pub preview_url: Option<String>,
    pub features: Vec<String>,
    pub requirements: Vec<String>,
    pub is_active: bool,
    pub is_featured: bool,
}

#[derive(Debug, Clone)]
pub struct DigitalProductUpdateInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub product_type: Option<String>,
    pub price_cents: Option<i32>,
    pub file_url: Option<Option<String>>,
    pub file_size: Option<Option<i64>>,
    pub cover_image: Option<Option<String>>,
    pub preview_url: Option<Option<String>>,
    pub features: Option<Vec<String>>,
    pub requirements: Option<Vec<String>>,
    pub is_active: Option<bool>,
    pub is_featured: Option<bool>,
}

pub async fn list_products(
    state: &AppState,
    filters: ProductListFilters,
) -> Result<DigitalProductListResponse, AppError> {
    let mut builder = QueryBuilder::new(
        r#"
        SELECT id, creator_id, title, description, product_type::text AS product_type, price_cents,
               file_url, file_size, cover_image, preview_url, features, requirements,
               sales_count, revenue_cents, is_active, is_featured, created_at, updated_at
        FROM digital_products
        WHERE 1 = 1
        "#,
    );

    if let Some(creator_id) = filters.creator_id {
        builder.push(" AND creator_id = ").push_bind(creator_id);
    }

    if let Some(product_type) = filters.product_type.as_ref() {
        builder
            .push(" AND product_type = ")
            .push_bind(product_type.to_ascii_uppercase())
            .push("::product_type");
    }

    if let Some(is_active) = filters.is_active {
        builder.push(" AND is_active = ").push_bind(is_active);
    }

    if let Some(is_featured) = filters.is_featured {
        builder.push(" AND is_featured = ").push_bind(is_featured);
    }

    builder.push(" ORDER BY created_at DESC");

    let products = builder
        .build_query_as::<DigitalProduct>()
        .fetch_all(&state.db_pool)
        .await?;

    Ok(DigitalProductListResponse { products })
}

pub async fn get_product(state: &AppState, id: Uuid) -> Result<DigitalProduct, AppError> {
    let product = sqlx::query_as::<_, DigitalProduct>(
        r#"
        SELECT id, creator_id, title, description, product_type::text AS product_type, price_cents,
               file_url, file_size, cover_image, preview_url, features, requirements,
               sales_count, revenue_cents, is_active, is_featured, created_at, updated_at
        FROM digital_products
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db_pool)
    .await?;

    product.ok_or(AppError::NotFound("Product not found".to_string()))
}

pub async fn create_product(
    state: &AppState,
    creator_id: Uuid,
    input: DigitalProductInput,
) -> Result<DigitalProduct, AppError> {
    let product = sqlx::query_as::<_, DigitalProduct>(
        r#"
        INSERT INTO digital_products (
            id,
            creator_id,
            title,
            description,
            product_type,
            price_cents,
            file_url,
            file_size,
            cover_image,
            preview_url,
            features,
            requirements,
            is_active,
            is_featured
        ) VALUES (
            $1, $2, $3, $4, $5::product_type, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING id, creator_id, title, description, product_type::text AS product_type, price_cents,
                  file_url, file_size, cover_image, preview_url, features, requirements,
                  sales_count, revenue_cents, is_active, is_featured, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(creator_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.product_type)
    .bind(input.price_cents)
    .bind(&input.file_url)
    .bind(input.file_size)
    .bind(&input.cover_image)
    .bind(&input.preview_url)
    .bind(&input.features)
    .bind(&input.requirements)
    .bind(input.is_active)
    .bind(input.is_featured)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(product)
}

pub async fn update_product(
    state: &AppState,
    product_id: Uuid,
    creator_id: Uuid,
    input: DigitalProductUpdateInput,
) -> Result<DigitalProduct, AppError> {
    let mut builder = QueryBuilder::new("UPDATE digital_products SET ");
    let mut separated = builder.separated(", ");
    let mut has_changes = false;

    if let Some(title) = input.title {
        separated.push("title = ").push_bind(title);
        has_changes = true;
    }
    if let Some(description) = input.description {
        separated.push("description = ").push_bind(description);
        has_changes = true;
    }
    if let Some(product_type) = input.product_type {
        separated
            .push("product_type = ")
            .push_bind(product_type)
            .push("::product_type");
        has_changes = true;
    }
    if let Some(price) = input.price_cents {
        separated.push("price_cents = ").push_bind(price);
        has_changes = true;
    }
    if let Some(file_url) = input.file_url {
        separated.push("file_url = ").push_bind(file_url);
        has_changes = true;
    }
    if let Some(file_size) = input.file_size {
        separated.push("file_size = ").push_bind(file_size);
        has_changes = true;
    }
    if let Some(cover_image) = input.cover_image {
        separated.push("cover_image = ").push_bind(cover_image);
        has_changes = true;
    }
    if let Some(preview_url) = input.preview_url {
        separated.push("preview_url = ").push_bind(preview_url);
        has_changes = true;
    }
    if let Some(features) = input.features {
        separated.push("features = ").push_bind(features);
        has_changes = true;
    }
    if let Some(requirements) = input.requirements {
        separated.push("requirements = ").push_bind(requirements);
        has_changes = true;
    }
    if let Some(is_active) = input.is_active {
        separated.push("is_active = ").push_bind(is_active);
        has_changes = true;
    }
    if let Some(is_featured) = input.is_featured {
        separated.push("is_featured = ").push_bind(is_featured);
        has_changes = true;
    }

    if !has_changes {
        return Err(AppError::Validation(vec![
            "No fields provided for update".to_string()
        ]));
    }

    separated.push("updated_at = NOW()");
    builder.push(" WHERE id = ").push_bind(product_id);
    builder.push(" AND creator_id = ").push_bind(creator_id);

    let result = builder.build().execute(&state.db_pool).await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Product not found".to_string()));
    }

    get_product(state, product_id).await
}

pub async fn purchase_product(
    state: &AppState,
    product_id: Uuid,
    user_id: Uuid,
) -> Result<Purchase, AppError> {
    // load product
    let product = get_product(state, product_id).await?;

    let existing = sqlx::query_as::<_, Purchase>(
        r#"
        SELECT id, product_id, user_id, amount_cents, status::text AS status, payment_method, transaction_id,
               download_count, last_download_at, purchased_at, updated_at
        FROM purchases
        WHERE product_id = $1 AND user_id = $2
        "#,
    )
    .bind(product_id)
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await?;

    if let Some(purchase) = existing {
        return Ok(purchase);
    }

    let purchase = sqlx::query_as::<_, Purchase>(
        r#"
        INSERT INTO purchases (
            id,
            product_id,
            user_id,
            amount_cents,
            status,
            payment_method,
            transaction_id
        ) VALUES (
            $1, $2, $3, $4, 'COMPLETED'::purchase_status, $5, $6
        )
        RETURNING id, product_id, user_id, amount_cents, status::text AS status, payment_method, transaction_id,
                  download_count, last_download_at, purchased_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(product_id)
    .bind(user_id)
    .bind(product.price_cents)
    .bind(Some("manual".to_string()))
    .bind(None::<String>)
    .fetch_one(&state.db_pool)
    .await?;

    sqlx::query(
        "UPDATE digital_products SET sales_count = sales_count + 1, revenue_cents = revenue_cents + $1 WHERE id = $2",
    )
    .bind(product.price_cents as i64)
    .bind(product_id)
    .execute(&state.db_pool)
    .await?;

    Ok(purchase)
}

pub async fn record_download(
    state: &AppState,
    product_id: Uuid,
    user_id: Uuid,
) -> Result<Purchase, AppError> {
    let purchase = sqlx::query_as::<_, Purchase>(
        r#"
        UPDATE purchases
        SET download_count = download_count + 1,
            last_download_at = NOW(),
            updated_at = NOW()
        WHERE product_id = $1 AND user_id = $2 AND status = 'COMPLETED'::purchase_status
        RETURNING id, product_id, user_id, amount_cents, status::text AS status, payment_method, transaction_id,
                  download_count, last_download_at, purchased_at, updated_at
        "#,
    )
    .bind(product_id)
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await?;

    purchase.ok_or(AppError::NotFound("Purchase not found".to_string()))
}

pub async fn list_user_purchases(
    state: &AppState,
    user_id: Uuid,
) -> Result<Vec<Purchase>, AppError> {
    let purchases = sqlx::query_as::<_, Purchase>(
        r#"
        SELECT id, product_id, user_id, amount_cents, status::text AS status, payment_method, transaction_id,
               download_count, last_download_at, purchased_at, updated_at
        FROM purchases
        WHERE user_id = $1
        ORDER BY purchased_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.db_pool)
    .await?;

    Ok(purchases)
}
