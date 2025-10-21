use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

use crate::utils::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,      // user id
    pub email: String,
    pub role: String,
    pub exp: usize,       // expiration time
    pub iat: usize,       // issued at
}

pub fn create_token(user_id: Uuid, email: &str, role: &str) -> AppResult<String> {
    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your-super-secret-jwt-key-minimum-32-characters".to_string());

    let expires_in = env::var("JWT_EXPIRES_IN")
        .unwrap_or_else(|_| "7d".to_string());

    // Parse expiration (simple implementation for days)
    let exp_days = if expires_in.ends_with('d') {
        expires_in[..expires_in.len()-1].parse::<i64>().unwrap_or(7)
    } else {
        7
    };

    let now = chrono::Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + chrono::Duration::days(exp_days)).timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        exp,
        iat,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to create token: {}", e)))
}

pub fn verify_token(token: &str) -> AppResult<Claims> {
    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your-super-secret-jwt-key-minimum-32-characters".to_string());

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))
}