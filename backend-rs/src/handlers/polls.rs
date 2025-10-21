use axum::extract::{Path, State};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_polls(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    // For now, return empty array - database connection issues
    // TODO: Implement proper database query when connection is stable
    tracing::info!("Polls endpoint called - returning empty array for now");
    Ok(ApiResponse::success(Vec::<serde_json::Value>::new()))
}

pub async fn create_poll(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create poll - TODO"))
}

pub async fn vote_poll(State(_state): State<AppState>, Path(_id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Vote poll - TODO"))
}
