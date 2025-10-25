use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id
    pub email: Option<String>,
    pub username: Option<String>,
    pub name: Option<String>,
    pub exp: usize,
    pub iat: usize,
}

pub fn verify_jwt(token: &str, secret: &str) -> Result<Claims, String> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| "Invalid token".to_string())?;

    Ok(token_data.claims)
}
