use axum::{extract::Request, http::header::AUTHORIZATION, middleware::Next, response::Response};

use crate::utils::{
    error::{AppError, AppResult},
    jwt::{verify_token, Claims},
};

#[derive(Clone)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub role: String,
}

impl From<Claims> for AuthUser {
    fn from(claims: Claims) -> Self {
        Self {
            id: claims.sub,
            email: claims.email,
            role: claims.role,
        }
    }
}

pub async fn auth_middleware(mut req: Request, next: Next) -> AppResult<Response> {
    let token = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .and_then(|header| {
            if header.starts_with("Bearer ") {
                Some(&header[7..])
            } else {
                None
            }
        })
        .ok_or_else(|| AppError::Unauthorized("Missing authorization token".to_string()))?;

    let claims = verify_token(token)?;
    let auth_user = AuthUser::from(claims);

    req.extensions_mut().insert(auth_user);

    Ok(next.run(req).await)
}

pub async fn optional_auth_middleware(mut req: Request, next: Next) -> AppResult<Response> {
    let token = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer "));

    if let Some(token) = token {
        match verify_token(token) {
            Ok(claims) => {
                let auth_user = AuthUser::from(claims);
                req.extensions_mut().insert(auth_user);
            }
            Err(err) => {
                tracing::warn!("optional authentication token rejected: {}", err);
            }
        }
    }

    Ok(next.run(req).await)
}
