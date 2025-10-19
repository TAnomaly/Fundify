use std::time::{Duration, SystemTime, UNIX_EPOCH};

use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};

use crate::config::AppConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub email: String,
    pub username: Option<String>,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

impl Claims {
    pub fn new(user_id: &str, email: &str, username: Option<&str>, role: &str) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0));
        let exp = now + Duration::from_secs(60 * 60 * 24 * 7);

        Self {
            sub: user_id.to_string(),
            user_id: user_id.to_string(),
            email: email.to_string(),
            username: username.map(ToOwned::to_owned),
            role: role.to_string(),
            iat: now.as_secs() as usize,
            exp: exp.as_secs() as usize,
        }
    }
}

pub fn create_token(
    claims: &Claims,
    config: &AppConfig,
) -> Result<String, jsonwebtoken::errors::Error> {
    let header = Header::new(Algorithm::HS256);
    encode(
        &header,
        claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
}
