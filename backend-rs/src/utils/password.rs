use anyhow::Result;
use bcrypt::{hash, verify, DEFAULT_COST};

pub fn hash_password(password: &str) -> Result<String> {
    let password = password.trim();
    if password.len() < 8 {
        anyhow::bail!("Password must be at least 8 characters long");
    }

    let hashed = hash(password, DEFAULT_COST)?;
    Ok(hashed)
}

pub fn verify_password(candidate: &str, hashed: &str) -> Result<bool> {
    Ok(verify(candidate, hashed)?)
}
