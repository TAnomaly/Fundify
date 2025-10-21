use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use serde_json::json;

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> impl IntoResponse {
        (
            StatusCode::OK,
            Json(ApiResponse {
                success: true,
                message: None,
                data: Some(data),
            }),
        )
    }

    pub fn created(data: T) -> impl IntoResponse {
        (
            StatusCode::CREATED,
            Json(ApiResponse {
                success: true,
                message: Some("Resource created successfully".to_string()),
                data: Some(data),
            }),
        )
    }

    pub fn success_with_message(data: T, message: String) -> impl IntoResponse {
        (
            StatusCode::OK,
            Json(ApiResponse {
                success: true,
                message: Some(message),
                data: Some(data),
            }),
        )
    }
}

pub fn success_message(message: &str) -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "message": message
        })),
    )
}
