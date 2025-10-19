use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("forbidden")]
    Forbidden(String),
    #[error("bad request")]
    BadRequest(String),
    #[error("validation failed")]
    Validation(Vec<String>),
    #[error(transparent)]
    Unexpected(#[from] anyhow::Error),
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<Vec<String>>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::Unexpected(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let body = ErrorBody {
            message: self.to_string(),
            details: match self {
                AppError::Validation(ref errors) => Some(errors.clone()),
                _ => None,
            },
        };

        (status, Json(body)).into_response()
    }
}

impl From<validator::ValidationErrors> for AppError {
    fn from(errors: validator::ValidationErrors) -> Self {
        let details = errors
            .field_errors()
            .iter()
            .flat_map(|(field, violations)| {
                violations.iter().map(move |violation| {
                    violation
                        .message
                        .clone()
                        .map(|msg| format!("{field}: {msg}"))
                        .unwrap_or_else(|| format!("{field}: invalid value"))
                })
            })
            .collect::<Vec<_>>();

        AppError::Validation(details)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => AppError::NotFound("Row not found".to_string()),
            other => AppError::Unexpected(other.into()),
        }
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(error: jsonwebtoken::errors::Error) -> Self {
        AppError::Unexpected(error.into())
    }
}

impl From<axum::extract::multipart::MultipartError> for AppError {
    fn from(error: axum::extract::multipart::MultipartError) -> Self {
        AppError::BadRequest(error.to_string())
    }
}
