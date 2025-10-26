use axum::{
    extract::{Json, Query, State},
    http::StatusCode,
    response::Json as AxumJson,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::{postgres::PgRow, Row};
use tracing::error;
use uuid::Uuid;

use crate::{auth::Claims, database::Database, models::Purchase};

const PURCHASE_WITH_PRODUCT_QUERY: &str = r#"
    SELECT
        p.id,
        p.product_id,
        p.user_id,
        p.amount,
        p.currency,
        p.status,
        p.stripe_payment_intent_id,
        p.stripe_checkout_session_id,
        p.created_at,
        pr.name AS product_name,
        pr.description AS product_description,
        pr.price AS product_price,
        pr.currency AS product_currency,
        pr.image_url AS product_image_url,
        pr.is_digital AS product_is_digital,
        pr.download_url AS product_download_url,
        pr.user_id AS product_creator_id
    FROM purchases p
    JOIN products pr ON pr.id = p.product_id
"#;

pub fn purchase_routes() -> Router<Database> {
    Router::new()
        .route("/me", get(get_my_purchases))
        .route("/confirm", post(confirm_purchase))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConfirmPurchaseRequest {
    session_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PurchaseQueryParams {
    #[serde(default)]
    pub status: Option<String>,
}

async fn get_my_purchases(
    State(db): State<Database>,
    claims: Claims,
    Query(params): Query<PurchaseQueryParams>,
) -> Result<AxumJson<serde_json::Value>, StatusCode> {
    let mut query = format!(
        "{} WHERE p.user_id = $1 ORDER BY p.created_at DESC",
        PURCHASE_WITH_PRODUCT_QUERY
    );

    let mut bind_status = None;
    if let Some(status) = params
        .status
        .as_ref()
        .map(|value| value.trim().to_ascii_uppercase())
        .filter(|value| !value.is_empty())
    {
        query = format!(
            "{} WHERE p.user_id = $1 AND UPPER(p.status) = $2 ORDER BY p.created_at DESC",
            PURCHASE_WITH_PRODUCT_QUERY
        );
        bind_status = Some(status);
    }

    let rows = if let Some(status) = bind_status {
        sqlx::query(&query)
            .bind(&claims.sub)
            .bind(status)
            .fetch_all(&db.pool)
            .await
            .map_err(|err| {
                error!(
                    "Failed to load purchases for user {}: {:?}",
                    claims.sub, err
                );
                StatusCode::INTERNAL_SERVER_ERROR
            })?
    } else {
        sqlx::query(&query)
            .bind(&claims.sub)
            .fetch_all(&db.pool)
            .await
            .map_err(|err| {
                error!(
                    "Failed to load purchases for user {}: {:?}",
                    claims.sub, err
                );
                StatusCode::INTERNAL_SERVER_ERROR
            })?
    };

    let mut purchases = Vec::with_capacity(rows.len());
    for row in rows {
        purchases.push(map_purchase_row(row)?);
    }

    Ok(AxumJson(json!({
        "success": true,
        "data": purchases
    })))
}

async fn confirm_purchase(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<ConfirmPurchaseRequest>,
) -> Result<AxumJson<serde_json::Value>, StatusCode> {
    if payload.session_id.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut purchase = sqlx::query_as::<_, Purchase>(
        r#"
        SELECT *
        FROM purchases
        WHERE stripe_checkout_session_id = $1
          AND user_id = $2
        LIMIT 1
        "#,
    )
    .bind(&payload.session_id)
    .bind(&claims.sub)
    .fetch_optional(&db.pool)
    .await
    .map_err(|err| {
        error!(
            "Failed to load purchase for session {}: {:?}",
            payload.session_id, err
        );
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    let stripe_secret =
        std::env::var("STRIPE_SECRET_KEY").map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if stripe_secret.trim().is_empty() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let client = reqwest::Client::new();
    let response = client
        .get(format!(
            "https://api.stripe.com/v1/checkout/sessions/{}",
            payload.session_id
        ))
        .header("Authorization", format!("Bearer {}", stripe_secret))
        .query(&[("expand[]", "payment_intent")])
        .send()
        .await
        .map_err(|err| {
            error!(
                "Failed to contact Stripe for session {}: {:?}",
                payload.session_id, err
            );
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        error!(
            "Stripe returned error for session {}: {}",
            payload.session_id, body
        );
        return Err(StatusCode::BAD_GATEWAY);
    }

    let session: serde_json::Value = response.json().await.map_err(|err| {
        error!(
            "Failed to parse Stripe session {} response: {:?}",
            payload.session_id, err
        );
        StatusCode::BAD_GATEWAY
    })?;

    let payment_status = session
        .get("payment_status")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let payment_intent_id = extract_payment_intent_id(&session);

    if payment_status == "paid" || payment_status == "complete" {
        purchase = sqlx::query_as::<_, Purchase>(
            r#"
            UPDATE purchases
            SET status = 'COMPLETED',
                stripe_payment_intent_id = COALESCE($1, stripe_payment_intent_id)
            WHERE id = $2
            RETURNING *
            "#,
        )
        .bind(payment_intent_id.clone())
        .bind(purchase.id)
        .fetch_one(&db.pool)
        .await
        .map_err(|err| {
            error!(
                "Failed to update purchase {} after Stripe confirmation: {:?}",
                purchase.id, err
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    let purchase_json = load_purchase_with_product(&db, purchase.id).await?;

    Ok(AxumJson(json!({
        "success": true,
        "data": purchase_json
    })))
}

fn extract_payment_intent_id(session: &serde_json::Value) -> Option<String> {
    match session.get("payment_intent") {
        Some(serde_json::Value::String(id)) => Some(id.clone()),
        Some(serde_json::Value::Object(obj)) => obj
            .get("id")
            .and_then(|value| value.as_str())
            .map(|id| id.to_string()),
        _ => None,
    }
}

fn map_purchase_row(row: PgRow) -> Result<serde_json::Value, StatusCode> {
    let id: Uuid = row.try_get("id").map_err(|err| map_row_error("id", err))?;
    let product_id: Uuid = row
        .try_get("product_id")
        .map_err(|err| map_row_error("product_id", err))?;
    let user_id: String = row
        .try_get("user_id")
        .map_err(|err| map_row_error("user_id", err))?;
    let amount: f64 = row
        .try_get("amount")
        .map_err(|err| map_row_error("amount", err))?;
    let currency: String = row
        .try_get("currency")
        .map_err(|err| map_row_error("currency", err))?;
    let status: String = row
        .try_get("status")
        .map_err(|err| map_row_error("status", err))?;
    let stripe_payment_intent_id: Option<String> = row
        .try_get("stripe_payment_intent_id")
        .map_err(|err| map_row_error("stripe_payment_intent_id", err))?;
    let stripe_checkout_session_id: Option<String> = row
        .try_get("stripe_checkout_session_id")
        .map_err(|err| map_row_error("stripe_checkout_session_id", err))?;
    let created_at: chrono::DateTime<chrono::Utc> = row
        .try_get("created_at")
        .map_err(|err| map_row_error("created_at", err))?;

    let product_name: String = row
        .try_get("product_name")
        .map_err(|err| map_row_error("product_name", err))?;
    let product_description: Option<String> = row
        .try_get("product_description")
        .map_err(|err| map_row_error("product_description", err))?;
    let product_price: f64 = row
        .try_get("product_price")
        .map_err(|err| map_row_error("product_price", err))?;
    let product_currency: String = row
        .try_get("product_currency")
        .map_err(|err| map_row_error("product_currency", err))?;
    let product_image_url: Option<String> = row
        .try_get("product_image_url")
        .map_err(|err| map_row_error("product_image_url", err))?;
    let product_is_digital: bool = row
        .try_get("product_is_digital")
        .map_err(|err| map_row_error("product_is_digital", err))?;
    let product_download_url: Option<String> = row
        .try_get("product_download_url")
        .map_err(|err| map_row_error("product_download_url", err))?;
    let product_creator_id: String = row
        .try_get("product_creator_id")
        .map_err(|err| map_row_error("product_creator_id", err))?;

    let product_json = json!({
        "id": product_id,
        "name": product_name.clone(),
        "title": product_name,
        "description": product_description,
        "price": product_price,
        "currency": product_currency,
        "image_url": product_image_url,
        "coverImage": product_image_url,
        "download_url": product_download_url,
        "fileUrl": product_download_url,
        "is_digital": product_is_digital,
        "user_id": product_creator_id.clone(),
        "creatorId": product_creator_id,
    });

    Ok(json!({
        "id": id,
        "productId": product_id,
        "userId": user_id,
        "amount": amount,
        "currency": currency,
        "status": status,
        "stripePaymentIntentId": stripe_payment_intent_id,
        "stripeCheckoutSessionId": stripe_checkout_session_id,
        "purchasedAt": created_at,
        "product": product_json
    }))
}

fn map_row_error<E: std::fmt::Debug>(field: &str, err: E) -> StatusCode {
    error!(
        "Failed to read field '{}' from purchase row: {:?}",
        field, err
    );
    StatusCode::INTERNAL_SERVER_ERROR
}

async fn load_purchase_with_product(
    db: &Database,
    purchase_id: Uuid,
) -> Result<serde_json::Value, StatusCode> {
    let row = sqlx::query(&format!(
        "{} WHERE p.id = $1 LIMIT 1",
        PURCHASE_WITH_PRODUCT_QUERY
    ))
    .bind(purchase_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|err| {
        error!(
            "Failed to load purchase {} with product details: {:?}",
            purchase_id, err
        );
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    map_purchase_row(row)
}
