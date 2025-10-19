use axum::{extract::multipart::MultipartError, http::StatusCode, response::{IntoResponse, Response}, Json};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Forbidden")]
    Forbidden,
    #[error("{0}")]
    BadRequest(String),
    #[error("Validation failed: {0}")]
    Validation(String),
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    Auth(String),
    #[error("Multipart error: {0}")]
    Multipart(String),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Jwt(#[from] jsonwebtoken::errors::Error),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl From<MultipartError> for AppError {
    fn from(err: MultipartError) -> Self {
        AppError::Multipart(err.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    success: bool,
    message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::NotFound => StatusCode::NOT_FOUND,
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::BadRequest(_) | AppError::Validation(_) | AppError::Multipart(_) => StatusCode::BAD_REQUEST,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::Auth(_) => StatusCode::UNAUTHORIZED,
            AppError::Database(_) | AppError::Jwt(_) | AppError::Other(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        };

        let message = self.to_string();

        let body = Json(ErrorResponse {
            success: false,
            message,
        });

        (status, body).into_response()
    }
}
