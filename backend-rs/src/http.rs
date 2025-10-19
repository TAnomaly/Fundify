use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T>
where
    T: Serialize,
{
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

pub fn success<T>(data: T) -> Response
where
    T: Serialize,
{
    Json(ApiResponse {
        success: true,
        message: None,
        data: Some(data),
    })
    .into_response()
}

pub fn success_message<T>(message: impl Into<String>, data: T) -> Response
where
    T: Serialize,
{
    Json(ApiResponse {
        success: true,
        message: Some(message.into()),
        data: Some(data),
    })
    .into_response()
}
