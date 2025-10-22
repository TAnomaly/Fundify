use axum::{extract::{Query, State}, Extension, Json, response::Redirect};
use sqlx::Row;
use std::collections::HashMap;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, Scope, TokenUrl, CsrfToken, TokenResponse};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use serde_json::Value;

use crate::{
    middleware::auth::AuthUser,
    models::user::{AuthResponse, LoginRequest, RegisterRequest, User, UserPublic},
    utils::{
        app_state::AppState,
        error::{AppError, AppResult},
        jwt::create_token,
        password::{hash_password, verify_password},
        response::ApiResponse,
    },
};

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Check if user already exists
    let existing_user: Option<User> = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password, name, username, avatar, "bannerImage" as banner_image, bio,
               role as "role: _", "emailVerified" as email_verified, "githubId" as github_id,
               "isCreator" as is_creator, "creatorBio" as creator_bio, "socialLinks" as social_links,
               "stripeCustomerId" as stripe_customer_id, "stripeAccountId" as stripe_account_id,
               "stripeOnboardingComplete" as stripe_onboarding_complete,
               "createdAt" as created_at, "updatedAt" as updated_at
        FROM "User"
        WHERE email = $1
        "#
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await?;

    if existing_user.is_some() {
        return Err(AppError::BadRequest(
            "User with this email already exists".to_string(),
        ));
    }

    // Hash password
    let hashed_password = hash_password(&req.password)?;

    // Create user
    let user: UserPublic = sqlx::query_as::<_, UserPublic>(
        r#"
        INSERT INTO "User" (email, password, name, bio)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, name, username, avatar, "bannerImage" as banner_image, bio,
                  role as "role: _", "isCreator" as is_creator, "createdAt" as created_at
        "#,
    )
    .bind(&req.email)
    .bind(&hashed_password)
    .bind(&req.name)
    .bind(&req.bio)
    .fetch_one(&state.db)
    .await?;

    // Generate JWT token
    let token = create_token(
        user.id,
        &user.email,
        &format!("{:?}", user.role).to_uppercase(),
    )?;

    let response = AuthResponse { user, token };

    Ok(ApiResponse::created(response))
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> AppResult<impl axum::response::IntoResponse> {
    // Find user
    let user: User = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password, name, username, avatar, "bannerImage" as banner_image, bio,
               role as "role: _", "emailVerified" as email_verified, "githubId" as github_id,
               "isCreator" as is_creator, "creatorBio" as creator_bio, "socialLinks" as social_links,
               "stripeCustomerId" as stripe_customer_id, "stripeAccountId" as stripe_account_id,
               "stripeOnboardingComplete" as stripe_onboarding_complete,
               "createdAt" as created_at, "updatedAt" as updated_at
        FROM "User"
        WHERE email = $1
        "#
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    // Verify password
    let is_valid = verify_password(&req.password, &user.password)?;

    if !is_valid {
        return Err(AppError::Unauthorized(
            "Invalid email or password".to_string(),
        ));
    }

    // Generate JWT token
    let token = create_token(
        user.id,
        &user.email,
        &format!("{:?}", user.role).to_uppercase(),
    )?;

    let user_public = UserPublic {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        banner_image: user.banner_image,
        bio: user.bio,
        role: user.role,
        is_creator: user.is_creator,
        created_at: user.created_at,
    };

    let response = AuthResponse {
        user: user_public,
        token,
    };

    Ok(ApiResponse::success(response))
}

pub async fn get_me(
    State(state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    // For now, return the first creator user as a demo
    let row = sqlx::query(
        r#"
        SELECT id, email, name, username, avatar, "bannerImage" as banner_image, bio,
               role, "isCreator" as is_creator, "createdAt"::timestamptz as created_at
        FROM "User"
        WHERE "isCreator" = true
        ORDER BY "createdAt" ASC
        LIMIT 1
        "#,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("No creator user found".to_string()))?;

    let user = UserPublic {
        id: row.get::<String, _>("id").parse().unwrap(),
        email: row.get("email"),
        name: row.get("name"),
        username: row.get("username"),
        avatar: row.get("avatar"),
        banner_image: row.get("banner_image"),
        bio: row.get("bio"),
        role: row.get("role"),
        is_creator: row.get("is_creator"),
        created_at: row.get("created_at"),
    };

    Ok(ApiResponse::success(user))
}

// GitHub OAuth handlers
pub async fn github_auth() -> AppResult<impl axum::response::IntoResponse> {
    let client_id = std::env::var("GITHUB_CLIENT_ID")
        .map_err(|_| AppError::Internal("GitHub client ID not configured".to_string()))?;
    
    let client_secret = std::env::var("GITHUB_CLIENT_SECRET")
        .map_err(|_| AppError::Internal("GitHub client secret not configured".to_string()))?;
    
    let redirect_uri = std::env::var("GITHUB_CALLBACK_URL")
        .unwrap_or_else(|_| "http://localhost:4000/api/auth/github/callback".to_string());

    let client = BasicClient::new(
        ClientId::new(client_id),
        Some(ClientSecret::new(client_secret)),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
            .map_err(|_| AppError::Internal("Invalid auth URL".to_string()))?,
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string())
            .map_err(|_| AppError::Internal("Invalid token URL".to_string()))?),
    )
    .set_redirect_uri(RedirectUrl::new(redirect_uri)
        .map_err(|_| AppError::Internal("Invalid redirect URI".to_string()))?);

    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("user:email".to_string()))
        .url();

    Ok(Redirect::to(auth_url.as_str()))
}

pub async fn github_callback(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<impl axum::response::IntoResponse> {
    let code = params.get("code")
        .ok_or_else(|| AppError::BadRequest("Missing authorization code".to_string()))?;

    let client_id = std::env::var("GITHUB_CLIENT_ID")
        .map_err(|_| AppError::Internal("GitHub client ID not configured".to_string()))?;
    
    let client_secret = std::env::var("GITHUB_CLIENT_SECRET")
        .map_err(|_| AppError::Internal("GitHub client secret not configured".to_string()))?;
    
    let redirect_uri = std::env::var("GITHUB_CALLBACK_URL")
        .unwrap_or_else(|_| "http://localhost:4000/api/auth/github/callback".to_string());

    let client = BasicClient::new(
        ClientId::new(client_id),
        Some(ClientSecret::new(client_secret)),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
            .map_err(|_| AppError::Internal("Invalid auth URL".to_string()))?,
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string())
            .map_err(|_| AppError::Internal("Invalid token URL".to_string()))?),
    )
    .set_redirect_uri(RedirectUrl::new(redirect_uri)
        .map_err(|_| AppError::Internal("Invalid redirect URI".to_string()))?);

    // Exchange code for token
    let token_result = client
        .exchange_code(oauth2::AuthorizationCode::new(code.clone()))
        .request_async(async_http_client)
        .await
        .map_err(|_| AppError::BadRequest("Failed to exchange code for token".to_string()))?;

    let access_token = token_result.access_token().secret();

    // Get user info from GitHub
    let client = reqwest::Client::new();
    let user_response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("token {}", access_token))
        .header("User-Agent", "Fundify-App")
        .send()
        .await
        .map_err(|_| AppError::BadRequest("Failed to fetch user info from GitHub".to_string()))?;

    let user_data: Value = user_response.json().await
        .map_err(|_| AppError::BadRequest("Failed to parse GitHub user data".to_string()))?;

    // Get user email
    let email_response = client
        .get("https://api.github.com/user/emails")
        .header("Authorization", format!("token {}", access_token))
        .header("User-Agent", "Fundify-App")
        .send()
        .await
        .map_err(|_| AppError::BadRequest("Failed to fetch user emails from GitHub".to_string()))?;

    let emails: Vec<Value> = email_response.json().await
        .map_err(|_| AppError::BadRequest("Failed to parse GitHub emails".to_string()))?;

    let email = emails.iter()
        .find(|e| e["primary"].as_bool().unwrap_or(false) && e["verified"].as_bool().unwrap_or(false))
        .or_else(|| emails.iter().find(|e| e["verified"].as_bool().unwrap_or(false)))
        .or_else(|| emails.first())
        .and_then(|e| e["email"].as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            let username = user_data["login"].as_str().unwrap_or("github-user");
            format!("{}@github-user.fundify.local", username)
        });

    let github_id = user_data["id"].as_i64().unwrap_or(0).to_string();
    let name = user_data["name"].as_str()
        .or_else(|| user_data["login"].as_str())
        .unwrap_or("GitHub User")
        .to_string();
    let avatar = user_data["avatar_url"].as_str().map(|s| s.to_string());

    // Check if user exists
    let existing_user: Option<User> = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password, name, username, avatar, "bannerImage" as banner_image, bio,
               role as "role: _", "emailVerified" as email_verified, "githubId" as github_id,
               "isCreator" as is_creator, "creatorBio" as creator_bio, "socialLinks" as social_links,
               "stripeCustomerId" as stripe_customer_id, "stripeAccountId" as stripe_account_id,
               "stripeOnboardingComplete" as stripe_onboarding_complete,
               "createdAt" as created_at, "updatedAt" as updated_at
        FROM "User"
        WHERE email = $1 OR "githubId" = $2
        "#
    )
    .bind(&email)
    .bind(&github_id)
    .fetch_optional(&state.db)
    .await?;

    let user = if let Some(mut user) = existing_user {
        // Update user with GitHub info if not already linked
        if user.github_id.is_none() {
            sqlx::query(
                r#"UPDATE "User" SET "githubId" = $1, avatar = COALESCE(avatar, $2) WHERE id = $3"#
            )
            .bind(&github_id)
            .bind(&avatar)
            .bind(&user.id)
            .execute(&state.db)
            .await?;
            
            user.github_id = Some(github_id);
            if user.avatar.is_none() {
                user.avatar = avatar;
            }
        }
        user
    } else {
        // Create new user
        let new_user: User = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO "User" (email, name, avatar, "githubId", password)
            VALUES ($1, $2, $3, $4, '')
            RETURNING id, email, password, name, username, avatar, "bannerImage" as banner_image, bio,
                      role as "role: _", "emailVerified" as email_verified, "githubId" as github_id,
                      "isCreator" as is_creator, "creatorBio" as creator_bio, "socialLinks" as social_links,
                      "stripeCustomerId" as stripe_customer_id, "stripeAccountId" as stripe_account_id,
                      "stripeOnboardingComplete" as stripe_onboarding_complete,
                      "createdAt" as created_at, "updatedAt" as updated_at
            "#
        )
        .bind(&email)
        .bind(&name)
        .bind(&avatar)
        .bind(&github_id)
        .fetch_one(&state.db)
        .await?;
        new_user
    };

    // Generate JWT token
    let token = create_token(
        user.id,
        &user.email,
        &format!("{:?}", user.role).to_uppercase(),
    )?;

    let user_public = UserPublic {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        banner_image: user.banner_image,
        bio: user.bio,
        role: user.role,
        is_creator: user.is_creator,
        created_at: user.created_at,
    };

    let response = AuthResponse {
        user: user_public,
        token,
    };

    // Redirect to frontend with token
    let frontend_url = std::env::var("CORS_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    
    Ok(Redirect::to(&format!("{}/auth/callback?token={}", frontend_url, response.token)))
}
