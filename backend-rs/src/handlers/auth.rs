use axum::{extract::State, Extension, Json};
use sqlx::Row;

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
