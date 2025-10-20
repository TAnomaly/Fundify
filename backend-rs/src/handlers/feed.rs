use axum::extract::State;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn get_feed(State(_state): State<AppState>) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Get feed - TODO"))
}
