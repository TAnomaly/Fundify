use axum::extract::{Path, State};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_events(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("List events - TODO"))
}

pub async fn create_event(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create event - TODO"))
}

pub async fn get_event(State(_state): State<AppState>, Path(_id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Get event - TODO"))
}

pub async fn rsvp_event(State(_state): State<AppState>, Path(_id): Path<Uuid>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("RSVP event - TODO"))
}
