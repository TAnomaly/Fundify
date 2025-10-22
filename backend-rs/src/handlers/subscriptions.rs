use axum::extract::{Path, State};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn create_subscription(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create subscription - TODO"))
}

pub async fn get_subscription(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Get subscription - TODO"))
}

pub async fn cancel_subscription(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Cancel subscription - TODO"))
}
