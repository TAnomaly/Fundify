use crate::error::AppError;
use crate::state::JwtContext;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub aud: String,
    pub exp: i64,
    pub iat: i64,
}

impl Claims {
    pub fn new(subject: Uuid, issuer: &str, audience: &str, expires_in: Duration) -> Self {
        let issued_at = Utc::now();
        let expires_at = issued_at + expires_in;

        Self {
            sub: subject.to_string(),
            iss: issuer.to_string(),
            aud: audience.to_string(),
            exp: expires_at.timestamp(),
            iat: issued_at.timestamp(),
        }
    }
}

pub fn encode_token(jwt: &JwtContext, subject: Uuid) -> Result<String, AppError> {
    let claims = Claims::new(subject, &jwt.issuer, &jwt.audience, jwt.expiration);
    let token = encode(&Header::new(Algorithm::HS256), &claims, &jwt.encoding)?;
    Ok(token)
}

#[allow(dead_code)]
pub fn decode_token(jwt: &JwtContext, token: &str) -> Result<Claims, AppError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&[jwt.audience.clone()]);
    validation.set_issuer(&[jwt.issuer.clone()]);

    let data = decode::<Claims>(token, &jwt.decoding, &validation)?;
    Ok(data.claims)
}
