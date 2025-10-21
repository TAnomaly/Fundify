use axum::extract::{Path, State};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_polls(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("List polls - TODO"))
}

pub async fn create_poll(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create poll - TODO"))
}

pub async fn vote_poll(State(_state): State<AppState>, Path(_id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Vote poll - TODO"))
}
