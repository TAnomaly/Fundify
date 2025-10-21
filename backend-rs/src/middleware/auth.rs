use axum::{extract::Request, http::header::AUTHORIZATION, middleware::Next, response::Response};
use uuid::Uuid;

use crate::utils::{
    error::{AppError, AppResult},
    jwt::{verify_token, Claims},
};

#[derive(Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,
}

impl From<Claims> for AuthUser {
    fn from(claims: Claims) -> Self {
        Self {
            id: Uuid::parse_str(&claims.sub).unwrap(),
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
