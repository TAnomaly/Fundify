use axum::extract::{Path, State};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn get_user(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("User details - TODO"))
}

pub async fn update_user(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("User updated - TODO"))
}
