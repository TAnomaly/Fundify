use axum::async_trait;
use axum::extract::FromRequestParts;
use axum::http::{header, request::Parts};
use sqlx::Row;
use uuid::Uuid;

use crate::error::AppError;
use crate::state::SharedState;
use crate::utils::jwt;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub role: String,
}

#[async_trait]
impl FromRequestParts<SharedState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &SharedState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or(AppError::Unauthorized)?;

        authenticate_from_header(state, auth_header).await
    }
}

fn extract_bearer_token(header_value: &str) -> Option<&str> {
    let mut parts = header_value.splitn(2, ' ');
    match (parts.next(), parts.next()) {
        (Some(scheme), Some(token)) if scheme.eq_ignore_ascii_case("bearer") => {
            let token = token.trim();
            if token.is_empty() {
                None
            } else {
                Some(token)
            }
        }
        _ => None,
    }
}

async fn authenticate_from_header(
    state: &SharedState,
    header_value: &str,
) -> Result<AuthUser, AppError> {
    let token = extract_bearer_token(header_value).ok_or(AppError::Unauthorized)?;

    let claims = jwt::decode_token(&state.jwt, token)?;
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;

    let found = sqlx::query("SELECT id, role FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.db_pool)
        .await?;

    let Some(record) = found else {
        return Err(AppError::Unauthorized);
    };

    Ok(AuthUser {
        id: record.get("id"),
        role: record
            .get::<Option<String>, _>("role")
            .unwrap_or_else(|| "USER".to_string()),
    })
}

#[derive(Debug, Clone)]
pub struct OptionalAuthUser(pub Option<AuthUser>);

#[async_trait]
impl FromRequestParts<SharedState> for OptionalAuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &SharedState,
    ) -> Result<Self, Self::Rejection> {
        match parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
        {
            None => Ok(OptionalAuthUser(None)),
            Some(header_value) => authenticate_from_header(state, header_value)
                .await
                .map(|user| OptionalAuthUser(Some(user))),
        }
    }
}
