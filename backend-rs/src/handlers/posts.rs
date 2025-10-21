use axum::extract::{Path, State};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_posts(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    // Return empty array for now - posts table might not exist
    Ok(ApiResponse::success(Vec::<serde_json::Value>::new()))
}

pub async fn create_post(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create post - TODO"))
}

pub async fn get_post(State(_state): State<AppState>, Path(_id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Get post - TODO"))
}
