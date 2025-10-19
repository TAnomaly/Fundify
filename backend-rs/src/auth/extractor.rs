use std::sync::Arc;

use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};
use jsonwebtoken::{decode, DecodingKey, Validation};

use crate::{config::AppConfig, error::AppError, state::AppState};

use super::jwt::Claims;

#[derive(Debug, Clone)]
pub struct AuthUser(pub Claims);

#[derive(Debug, Clone)]
pub struct MaybeAuthUser(pub Option<Claims>);

fn extract_token(parts: &Parts) -> Result<String, AppError> {
    let auth_header = parts
        .headers
        .get(header::AUTHORIZATION)
        .ok_or_else(|| AppError::Auth("Authentication required".into()))?;

    let auth_str = auth_header
        .to_str()
        .map_err(|_| AppError::Auth("Invalid authorization header".into()))?
        .trim();

    if let Some(token) = auth_str.strip_prefix("Bearer ") {
        Ok(token.to_string())
    } else {
        Err(AppError::Auth("Authentication required".into()))
    }
}

fn decode_claims(token: &str, config: &AppConfig) -> Result<Claims, AppError> {
    let validation = Validation::default();
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &validation,
    )?;
    Ok(token_data.claims)
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    Arc<AppConfig>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let token = extract_token(parts)?;
        let claims = decode_claims(&token, &app_state.config)?;
        Ok(AuthUser(claims))
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for MaybeAuthUser
where
    AppState: FromRef<S>,
    Arc<AppConfig>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        if let Ok(token) = extract_token(parts) {
            match decode_claims(&token, &app_state.config) {
                Ok(claims) => Ok(MaybeAuthUser(Some(claims))),
                Err(_) => Ok(MaybeAuthUser(None)),
            }
        } else {
            Ok(MaybeAuthUser(None))
        }
    }
}
