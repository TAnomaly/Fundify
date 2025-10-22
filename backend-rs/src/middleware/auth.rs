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
    pub username: Option<String>,
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
    let Claims {
        sub,
        id,
        user_id,
        email,
        username,
        role,
        ..
    } = claims;

    let resolved_id = user_id
        .or(id)
        .or(sub)
        .ok_or_else(|| AppError::Unauthorized("Invalid token payload".to_string()))?;

    let auth_user = AuthUser {
        id: resolved_id,
        email,
        role,
        username,
    };

    req.extensions_mut().insert(auth_user);

    Ok(next.run(req).await)
}
