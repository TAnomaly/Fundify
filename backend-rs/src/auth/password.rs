use anyhow::Result;
use bcrypt::{hash, verify, DEFAULT_COST};

#[allow(dead_code)]
pub fn hash_password(password: &str) -> Result<String> {
    Ok(hash(password, DEFAULT_COST)?)
}

#[allow(dead_code)]
pub fn verify_password(password: &str, hashed: &str) -> Result<bool> {
    Ok(verify(password, hashed)?)
}
