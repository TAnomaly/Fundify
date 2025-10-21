use axum::extract::{Path, State};

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_articles(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    // For now, return empty array - database connection issues
    // TODO: Implement proper database query when connection is stable
    tracing::info!("Articles endpoint called - returning empty array for now");
    Ok(ApiResponse::success(Vec::<serde_json::Value>::new()))
}

pub async fn create_article(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create article - TODO"))
}

pub async fn get_article(State(_state): State<AppState>, Path(_slug): Path<String>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Get article - TODO"))
}
