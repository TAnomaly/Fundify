use axum::extract::{Path, State};

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_articles(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("List articles - TODO"))
}

pub async fn create_article(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create article - TODO"))
}

pub async fn get_article(State(_state): State<AppState>, Path(_slug): Path<String>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Get article - TODO"))
}
