use crate::error::AppError;
use crate::models::user::{PublicUser, User};
use crate::state::AppState;
use crate::utils::{jwt, password};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct RegisterPayload {
    pub email: String,
    pub password: String,
    pub name: String,
    pub username: Option<String>,
}

#[derive(Debug, Clone)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

pub async fn register_user(
    state: &AppState,
    payload: RegisterPayload,
) -> Result<(PublicUser, String), AppError> {
    let email = normalize_email(&payload.email);
    let username = payload.username.as_ref().map(normalize_username);

    ensure_unique_email(&state.db_pool, &email).await?;
    if let Some(username) = &username {
        ensure_unique_username(&state.db_pool, username).await?;
    }

    let password_hash = password::hash_password(&payload.password)?;
    let user_id = Uuid::new_v4();

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, password_hash, name, username)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            email,
            password_hash,
            name,
            username,
            avatar,
            banner_image,
            bio,
            creator_bio,
            role,
            is_creator,
            social_links,
            created_at,
            updated_at
        "#,
    )
    .bind(user_id)
    .bind(&email)
    .bind(&password_hash)
    .bind(payload.name.trim())
    .bind(username.as_deref())
    .fetch_one(&state.db_pool)
    .await?;

    let token = jwt::encode_token(&state.jwt, user.id)?;
    Ok((PublicUser::from(user), token))
}

pub async fn login_user(
    state: &AppState,
    payload: LoginPayload,
) -> Result<(PublicUser, String), AppError> {
    let email = normalize_email(&payload.email);

    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT
            id,
            email,
            password_hash,
            name,
            username,
            avatar,
            banner_image,
            bio,
            creator_bio,
            role,
            is_creator,
            social_links,
            created_at,
            updated_at
        FROM users
        WHERE email = $1
        "#,
    )
    .bind(&email)
    .fetch_optional(&state.db_pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    if !password::verify_password(&payload.password, &user.password_hash)? {
        return Err(AppError::Unauthorized);
    }

    let user_id = user.id;
    let token = jwt::encode_token(&state.jwt, user_id)?;

    Ok((PublicUser::from(user), token))
}

async fn ensure_unique_email(pool: &PgPool, email: &str) -> Result<(), AppError> {
    let exists =
        sqlx::query_scalar::<_, i64>("SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1")
            .bind(email)
            .fetch_optional(pool)
            .await?
            .is_some();

    if exists {
        Err(AppError::Validation(vec![
            "Email is already registered".to_string()
        ]))
    } else {
        Ok(())
    }
}

async fn ensure_unique_username(pool: &PgPool, username: &str) -> Result<(), AppError> {
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1",
    )
    .bind(username)
    .fetch_optional(pool)
    .await?
    .is_some();

    if exists {
        Err(AppError::Validation(vec![
            "Username is already in use".to_string()
        ]))
    } else {
        Ok(())
    }
}

fn normalize_email(email: &str) -> String {
    email.trim().to_ascii_lowercase()
}

fn normalize_username(username: &String) -> String {
    username.trim().to_ascii_lowercase()
}
