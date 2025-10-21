use bcrypt::{hash, verify, DEFAULT_COST};

use crate::utils::error::{AppError, AppResult};

pub fn hash_password(password: &str) -> AppResult<String> {
    hash(password, DEFAULT_COST)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))
}

pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    verify(password, hash)
        .map_err(|e| AppError::Internal(format!("Failed to verify password: {}", e)))
}
