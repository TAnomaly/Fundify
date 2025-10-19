use std::time::Duration;

use anyhow::anyhow;
use axum::{
    extract::{Query, State},
    response::Redirect,
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::Utc;
use hmac::{Hmac, Mac};
use oauth2::{
    basic::BasicClient, reqwest::async_http_client, AuthUrl, AuthorizationCode, ClientId,
    ClientSecret, CsrfToken, RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use rand::RngCore;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use tracing::{error, instrument, warn};
use uuid::Uuid;
use validator::Validate;

use crate::{
    auth::{create_token, hash_password, verify_password, AuthUser, Claims},
    error::AppError,
    models::user::{UserGithubLink, UserPublic, UserWithPassword},
    state::AppState,
};

#[derive(Debug, Deserialize, Validate)]
struct RegisterRequest {
    #[validate(email(message = "Invalid email address"))]
    email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    password: String,
    #[validate(length(min = 2, message = "Name must be at least 2 characters"))]
    name: String,
    bio: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
struct LoginRequest {
    #[validate(email(message = "Invalid email address"))]
    email: String,
    #[validate(length(min = 1, message = "Password is required"))]
    password: String,
}

#[derive(Debug, Serialize)]
struct AuthResponse {
    user: UserPublic,
    token: String,
}

#[derive(Debug, Deserialize)]
struct GithubCallbackQuery {
    code: String,
    state: String,
}

#[derive(Debug, Deserialize)]
struct GithubUserResponse {
    id: i64,
    login: String,
    name: Option<String>,
    email: Option<String>,
    avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubEmailEntry {
    email: String,
    primary: bool,
    verified: bool,
}

#[derive(Debug)]
struct GithubProfile {
    id: String,
    login: String,
    name: Option<String>,
    avatar_url: Option<String>,
    email: String,
}

type HmacSha256 = Hmac<Sha256>;

const STATE_TTL_SECS: i64 = 600;
const GITHUB_AUTHORIZE_URL: &str = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_USER_API: &str = "https://api.github.com/user";
const GITHUB_EMAILS_API: &str = "https://api.github.com/user/emails";
const GITHUB_USER_AGENT: &str = "Fundify-Rust/1.0";

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/me", get(get_me))
        .route("/github", get(github_login))
        .route("/github/callback", get(github_callback))
}

#[instrument(skip(state, payload))]
async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let exists: bool =
        sqlx::query_scalar(r#"SELECT EXISTS (SELECT 1 FROM "User" WHERE email = $1)"#)
            .bind(&payload.email)
            .fetch_one(&state.pool)
            .await?;

    if exists {
        return Err(AppError::Conflict(
            "User with this email already exists".into(),
        ));
    }

    let hashed = hash_password(&payload.password)?;

    let user: UserPublic = sqlx::query_as(
        r#"
        INSERT INTO "User" (email, password, name, bio)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            email,
            name,
            username,
            avatar,
            bio,
            role::text AS role,
            "createdAt" AS created_at
        "#,
    )
    .bind(&payload.email)
    .bind(&hashed)
    .bind(&payload.name)
    .bind(&payload.bio)
    .fetch_one(&state.pool)
    .await?;

    let username_claim = user
        .username
        .as_deref()
        .or_else(|| Some(user.name.as_str()));
    let claims = Claims::new(
        &user.id.to_string(),
        &user.email,
        username_claim,
        &user.role,
    );
    let token = create_token(&claims, &state.config)?;

    Ok(Json(json!({
        "success": true,
        "message": "User registered successfully",
        "data": AuthResponse { user, token }
    })))
}

#[instrument(skip(state, payload))]
async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let record = sqlx::query_as::<_, UserWithPassword>(
        r#"
        SELECT
            id,
            email,
            name,
            username,
            avatar,
            bio,
            role::text AS role,
            password,
            "createdAt" AS created_at
        FROM "User"
        WHERE email = $1
        "#,
    )
    .bind(&payload.email)
    .fetch_optional(&state.pool)
    .await?;

    let record = match record {
        Some(r) => r,
        None => return Err(AppError::Auth("Invalid email or password".into())),
    };

    let valid = verify_password(&payload.password, &record.password)?;
    if !valid {
        return Err(AppError::Auth("Invalid email or password".into()));
    }

    let user = UserPublic::from(record);
    let username_claim = user
        .username
        .as_deref()
        .or_else(|| Some(user.name.as_str()));
    let claims = Claims::new(
        &user.id.to_string(),
        &user.email,
        username_claim,
        &user.role,
    );
    let token = create_token(&claims, &state.config)?;

    Ok(Json(json!({
        "success": true,
        "message": "Login successful",
        "data": AuthResponse { user, token }
    })))
}

#[instrument(skip(state, auth_user))]
async fn get_me(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = Uuid::parse_str(&auth_user.0.user_id)
        .map_err(|_| AppError::Auth("Invalid token payload".into()))?;

    let user = sqlx::query_as::<_, UserPublic>(
        r#"
        SELECT
            id,
            email,
            name,
            username,
            avatar,
            bio,
            role::text AS role,
            "createdAt" AS created_at
        FROM "User"
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    let Some(user) = user else {
        return Err(AppError::NotFound);
    };

    Ok(Json(json!({
        "success": true,
        "data": user
    })))
}

#[instrument(skip(state))]
async fn github_login(State(state): State<AppState>) -> Result<Redirect, AppError> {
    let client = github_oauth_client(&state.config)?;
    let state_token = generate_state(&state.config.jwt_secret)?;
    let csrf = CsrfToken::new(state_token.clone());
    let (authorize_url, _) = client
        .authorize_url(|| csrf)
        .add_scope(Scope::new("user:email".to_string()))
        .url();

    Ok(Redirect::temporary(authorize_url.as_str()))
}

#[instrument(skip(state, query))]
async fn github_callback(
    State(state): State<AppState>,
    Query(query): Query<GithubCallbackQuery>,
) -> Result<Redirect, AppError> {
    let failure_url = github_failure_redirect(&state.config);

    if !verify_state(&query.state, &state.config.jwt_secret) {
        warn!("Invalid GitHub OAuth state parameter");
        return Ok(Redirect::temporary(&failure_url));
    }

    match github_callback_inner(&state, &query.code).await {
        Ok(token) => {
            let success_url = github_success_redirect(&state.config, &token);
            Ok(Redirect::temporary(&success_url))
        }
        Err(err) => {
            error!(error = ?err, "GitHub OAuth callback failed");
            Ok(Redirect::temporary(&failure_url))
        }
    }
}

async fn github_callback_inner(state: &AppState, code: &str) -> Result<String, AppError> {
    let client = github_oauth_client(&state.config)?;
    let token = client
        .exchange_code(AuthorizationCode::new(code.to_string()))
        .request_async(async_http_client)
        .await
        .map_err(|e| AppError::Auth(format!("GitHub token exchange failed: {e}")))?;

    let access_token = token.access_token().secret().to_owned();

    let profile = fetch_github_profile(&access_token).await?;
    let user = upsert_github_user(state, &profile).await?;

    let username_claim = user
        .username
        .as_deref()
        .or_else(|| Some(user.name.as_str()));
    let claims = Claims::new(
        &user.id.to_string(),
        &user.email,
        username_claim,
        &user.role,
    );
    let token = create_token(&claims, &state.config)?;
    Ok(token)
}

fn github_oauth_client(config: &crate::config::AppConfig) -> Result<BasicClient, AppError> {
    let client_id = config
        .github_client_id
        .as_ref()
        .ok_or_else(|| AppError::BadRequest("GitHub OAuth is not configured".into()))?;
    let client_secret = config
        .github_client_secret
        .as_ref()
        .ok_or_else(|| AppError::BadRequest("GitHub OAuth is not configured".into()))?;
    let redirect_uri = config
        .github_redirect_uri()
        .ok_or_else(|| AppError::BadRequest("GitHub OAuth redirect URI missing".into()))?;

    let auth_url =
        AuthUrl::new(GITHUB_AUTHORIZE_URL.to_string()).map_err(|e| AppError::Other(anyhow!(e)))?;
    let token_url =
        TokenUrl::new(GITHUB_TOKEN_URL.to_string()).map_err(|e| AppError::Other(anyhow!(e)))?;
    let redirect_url = RedirectUrl::new(redirect_uri).map_err(|e| AppError::Other(anyhow!(e)))?;

    Ok(BasicClient::new(
        ClientId::new(client_id.clone()),
        Some(ClientSecret::new(client_secret.clone())),
        auth_url,
        Some(token_url),
    )
    .set_redirect_uri(redirect_url))
}

fn generate_state(secret: &str) -> Result<String, AppError> {
    let mut rng = rand::thread_rng();
    let mut nonce_bytes = [0u8; 16];
    rng.fill_bytes(&mut nonce_bytes);
    let nonce = URL_SAFE_NO_PAD.encode(&nonce_bytes);
    let timestamp = Utc::now().timestamp();
    let payload = format!("{nonce}:{timestamp}");

    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| AppError::Other(anyhow!(e)))?;
    mac.update(payload.as_bytes());
    let signature = hex::encode(mac.finalize().into_bytes());

    Ok(format!("{payload}:{signature}"))
}

fn verify_state(state: &str, secret: &str) -> bool {
    let mut parts = state.split(':');
    let (Some(nonce), Some(ts_str), Some(signature), None) =
        (parts.next(), parts.next(), parts.next(), parts.next())
    else {
        return false;
    };

    let timestamp = match ts_str.parse::<i64>() {
        Ok(ts) => ts,
        Err(_) => return false,
    };

    let now = Utc::now().timestamp();
    if timestamp > now + 60 || now - timestamp > STATE_TTL_SECS {
        return false;
    }

    let payload = format!("{nonce}:{timestamp}");
    let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(payload.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());
    subtle_equals(&expected, signature)
}

fn subtle_equals(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (x, y) in a.bytes().zip(b.bytes()) {
        diff |= x ^ y;
    }
    diff == 0
}

async fn fetch_github_profile(access_token: &str) -> Result<GithubProfile, AppError> {
    let client = reqwest::Client::builder()
        .user_agent(GITHUB_USER_AGENT)
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Other(anyhow!(e)))?;

    let user: GithubUserResponse = client
        .get(GITHUB_USER_API)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("GitHub user request failed: {e}")))?
        .error_for_status()
        .map_err(|e| AppError::Auth(format!("GitHub user request failed: {e}")))?
        .json()
        .await
        .map_err(|e| AppError::Auth(format!("Invalid GitHub user response: {e}")))?;

    let mut email = user.email.clone();

    if email.is_none() {
        match client
            .get(GITHUB_EMAILS_API)
            .bearer_auth(access_token)
            .send()
            .await
        {
            Ok(response) => {
                if response.status() == StatusCode::OK {
                    let emails: Vec<GithubEmailEntry> = response.json().await.map_err(|e| {
                        AppError::Auth(format!("Invalid GitHub emails response: {e}"))
                    })?;
                    if let Some(primary) = emails.iter().find(|e| e.primary && e.verified) {
                        email = Some(primary.email.clone());
                    } else if let Some(verified) = emails.iter().find(|e| e.verified) {
                        email = Some(verified.email.clone());
                    } else if let Some(first) = emails.first() {
                        email = Some(first.email.clone());
                    }
                }
            }
            Err(err) => {
                warn!(error = %err, "Failed to fetch GitHub email list");
            }
        }
    }

    let email = email.unwrap_or_else(|| format!("{}@github-user.fundify.local", user.login));

    Ok(GithubProfile {
        id: user.id.to_string(),
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        email,
    })
}

async fn upsert_github_user(
    state: &AppState,
    profile: &GithubProfile,
) -> Result<UserPublic, AppError> {
    let mut tx = state.pool.begin().await?;

    let existing = sqlx::query_as::<_, UserGithubLink>(
        r#"
        SELECT id, "githubId" AS "github_id"
        FROM "User"
        WHERE email = $1
        "#,
    )
    .bind(&profile.email)
    .fetch_optional(&mut *tx)
    .await?;

    let display_name = profile
        .name
        .as_deref()
        .filter(|name| !name.trim().is_empty())
        .unwrap_or(&profile.login);

    let user = if let Some(existing) = existing {
        if existing.github_id.is_none() {
            sqlx::query_as::<_, UserPublic>(
                r#"
                UPDATE "User"
                SET "githubId" = $1,
                    avatar = COALESCE(avatar, $2)
                WHERE id = $3
                RETURNING
                    id,
                    email,
                    name,
                    username,
                    avatar,
                    bio,
                    role::text AS role,
                    "createdAt" AS created_at
                "#,
            )
            .bind(&profile.id)
            .bind(&profile.avatar_url)
            .bind(existing.id)
            .fetch_one(&mut *tx)
            .await?
        } else {
            sqlx::query_as::<_, UserPublic>(
                r#"
                SELECT
                    id,
                    email,
                    name,
                    username,
                    avatar,
                    bio,
                    role::text AS role,
                    "createdAt" AS created_at
                FROM "User"
                WHERE id = $1
                "#,
            )
            .bind(existing.id)
            .fetch_one(&mut *tx)
            .await?
        }
    } else {
        sqlx::query_as::<_, UserPublic>(
            r#"
            INSERT INTO "User" (email, password, name, avatar, "githubId")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING
                id,
                email,
                name,
                username,
                avatar,
                bio,
                role::text AS role,
                "createdAt" AS created_at
            "#,
        )
        .bind(&profile.email)
        .bind("")
        .bind(display_name)
        .bind(&profile.avatar_url)
        .bind(&profile.id)
        .fetch_one(&mut *tx)
        .await?
    };

    tx.commit().await?;
    Ok(user)
}

fn github_success_redirect(config: &crate::config::AppConfig, token: &str) -> String {
    let base = config.frontend_base();
    format!("{}/auth/callback?token={}", base, token)
}

fn github_failure_redirect(config: &crate::config::AppConfig) -> String {
    let base = config.frontend_base();
    format!("{}/login?error=github_auth_failed", base)
}
