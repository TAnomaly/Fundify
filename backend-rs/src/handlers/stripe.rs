use axum::extract::State;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn create_checkout_session(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create checkout session - TODO"))
}

pub async fn create_connect_account(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create connect account - TODO"))
}

pub async fn webhook(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Stripe webhook - TODO"))
}
