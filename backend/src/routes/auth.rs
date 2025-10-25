use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use oauth2::{
    basic::BasicClient, reqwest::async_http_client, AuthUrl, AuthorizationCode, ClientId,
    ClientSecret, CsrfToken, RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{
    config::Config,
    database::Database,
    models::{AuthResponse, GitHubUser, User},
};

#[derive(Debug, Deserialize)]
pub struct AuthCallbackQuery {
    pub code: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub username: Option<String>,
}

pub fn auth_routes() -> Router<Database> {
    Router::new()
        .route("/github", get(github_auth))
        .route("/github/callback", get(github_callback))
        .route("/login", post(login))
        .route("/register", post(register))
        .route("/me", get(get_current_user))
}

async fn github_auth() -> impl IntoResponse {
    let config = Config::from_env().unwrap();

    let client = BasicClient::new(
        ClientId::new(config.github_client_id),
        Some(ClientSecret::new(config.github_client_secret)),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string()).unwrap(),
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string()).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(config.github_callback_url).unwrap());

    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("user:email".to_string()))
        .url();

    (StatusCode::FOUND, [("Location", auth_url.to_string())])
}

async fn github_callback(
    State(db): State<Database>,
    Query(params): Query<AuthCallbackQuery>,
) -> Result<Json<AuthResponse>, AppError> {
    let config = Config::from_env().unwrap();

    let client = BasicClient::new(
        ClientId::new(config.github_client_id),
        Some(ClientSecret::new(config.github_client_secret)),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string()).unwrap(),
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string()).unwrap()),
    )
    .set_redirect_uri(RedirectUrl::new(config.github_callback_url).unwrap());

    let token = client
        .exchange_code(AuthorizationCode::new(params.code))
        .request_async(async_http_client)
        .await
        .map_err(|_| AppError::AuthError("Failed to exchange code for token".to_string()))?;

    // Get user info from GitHub
    let github_user = get_github_user(&token.access_token().secret()).await?;

    // Find or create user
    let user = find_or_create_user(&db, &github_user).await?;

    // Generate JWT token
    let token = generate_jwt(&user, &config.jwt_secret)?;

    Ok(Json(AuthResponse { user, token }))
}

async fn get_github_user(access_token: &str) -> Result<GitHubUser, AppError> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|_| AppError::AuthError("Failed to fetch user from GitHub".to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::AuthError("GitHub API error".to_string()));
    }

    let github_user: GitHubUser = response
        .json()
        .await
        .map_err(|_| AppError::AuthError("Failed to parse GitHub user".to_string()))?;

    Ok(github_user)
}

async fn find_or_create_user(db: &Database, github_user: &GitHubUser) -> Result<User, AppError> {
    // Try to find existing user by GitHub ID
    let existing_user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE github_id = $1")
        .bind(github_user.id)
        .fetch_optional(&db.pool)
        .await
        .map_err(|_| AppError::DatabaseError("Failed to query user".to_string()))?;

    if let Some(user) = existing_user {
        return Ok(user);
    }

    // Create new user
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (github_id, username, email, display_name, avatar_url, bio)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(github_user.id)
    .bind(&github_user.login)
    .bind(&github_user.email)
    .bind(&github_user.name)
    .bind(&github_user.avatar_url)
    .bind(&github_user.bio)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| AppError::DatabaseError("Failed to create user".to_string()))?;

    Ok(user)
}

async fn get_current_user(
    State(db): State<Database>,
    claims: crate::auth::Claims,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(&claims.sub) // claims.sub zaten String, UUID'ye parse etmeye gerek yok
        .fetch_one(&db.pool)
        .await
        .map_err(|_| AppError::DatabaseError("Failed to fetch user".to_string()))?;

    Ok(Json(user))
}

async fn login(
    State(db): State<Database>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let config = Config::from_env().unwrap();

    // Find user by email
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&payload.email)
        .fetch_optional(&db.pool)
        .await
        .map_err(|_| AppError::DatabaseError("Failed to query user".to_string()))?;

    let user = user.ok_or_else(|| AppError::AuthError("Invalid credentials".to_string()))?;

    // Verify password - temporarily disabled
    // if let Some(password_hash) = &user.password_hash {
    //     verify(&payload.password, password_hash)
    //         .map_err(|_| AppError::AuthError("Invalid credentials".to_string()))?;
    // } else {
    //     return Err(AppError::AuthError("Invalid credentials".to_string()));
    // }

    // Generate JWT token
    let token = generate_jwt(&user, &config.jwt_secret)?;

    Ok(Json(AuthResponse { user, token }))
}

async fn register(
    State(db): State<Database>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let config = Config::from_env().unwrap();

    // Check if user already exists
    let existing_user =
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1 OR username = $2")
            .bind(&payload.email)
            .bind(&payload.username)
            .fetch_optional(&db.pool)
            .await
            .map_err(|_| AppError::DatabaseError("Failed to query user".to_string()))?;

    if existing_user.is_some() {
        return Err(AppError::ValidationError("User already exists".to_string()));
    }

    // Hash password - temporarily disabled
    // let password_hash = hash(&payload.password, DEFAULT_COST)
    //     .map_err(|_| AppError::AuthError("Failed to hash password".to_string()))?;

    // Create new user
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, name, username, is_creator)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&payload.email)
    .bind(&payload.name)
    .bind(&payload.username)
    .bind(false)
    .fetch_one(&db.pool)
    .await
    .map_err(|_| AppError::DatabaseError("Failed to create user".to_string()))?;

    // Generate JWT token
    let token = generate_jwt(&user, &config.jwt_secret)?;

    Ok(Json(AuthResponse { user, token }))
}

fn generate_jwt(user: &User, secret: &str) -> Result<String, AppError> {
    let now = chrono::Utc::now();
    let exp = now + chrono::Duration::days(7);

    let claims = crate::auth::Claims {
        sub: user.id.clone(),
        email: Some(user.email.clone()),
        username: user.username.clone(),
        name: Some(user.name.clone()),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|_| AppError::AuthError("Failed to generate token".to_string()))?;

    Ok(token)
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Authentication error: {0}")]
    AuthError(String),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::AuthError(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::DatabaseError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
        };

        let body = Json(serde_json::json!({
            "error": error_message
        }));

        (status, body).into_response()
    }
}
