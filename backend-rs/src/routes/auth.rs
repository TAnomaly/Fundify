use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::error::AppError;
use crate::models::user::PublicUser;
use crate::services::auth_service::{self, LoginPayload, RegisterPayload};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct RegisterRequest {
    #[validate(email)]
    email: String,
    #[validate(length(min = 8, max = 72))]
    password: String,
    #[validate(length(min = 2, max = 60))]
    name: String,
    #[serde(default)]
    #[validate(length(min = 3, max = 32))]
    username: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
struct LoginRequest {
    #[validate(email)]
    email: String,
    #[validate(length(min = 8, max = 72))]
    password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthResponse {
    token: String,
    user: PublicUser,
}

async fn register(
    State(state): State<SharedState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;
    let register_payload = RegisterPayload {
        email: payload.email,
        password: payload.password,
        name: payload.name,
        username: payload.username,
    };

    let (user, token) = auth_service::register_user(&state, register_payload).await?;
    let response = AuthResponse { token, user };

    Ok((StatusCode::CREATED, Json(response)))
}

async fn login(
    State(state): State<SharedState>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    payload.validate()?;
    let login_payload = LoginPayload {
        email: payload.email,
        password: payload.password,
    };

    let (user, token) = auth_service::login_user(&state, login_payload).await?;
    let response = AuthResponse { token, user };

    Ok((StatusCode::OK, Json(response)))
}
