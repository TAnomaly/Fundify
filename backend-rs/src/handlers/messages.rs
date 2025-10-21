use axum::extract::State;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

pub async fn list_messages(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("List messages - TODO"))
}

pub async fn send_message(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Send message - TODO"))
}
