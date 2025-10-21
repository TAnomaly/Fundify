use axum::extract::State;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_tiers(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("List tiers - TODO"))
}

pub async fn create_tier(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create tier - TODO"))
}
