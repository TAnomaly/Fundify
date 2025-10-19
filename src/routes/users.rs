use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::models::user::{
    CreatorListResponse, CreatorProfile, MeProfile, PublicUser, PublicUserProfile,
};
use crate::services::campaign_service::CampaignListResponse;
use crate::services::follow_service::{
    follow_user as follow_user_action, list_followers, list_following,
    unfollow_user as unfollow_user_action, FollowListResponse, FollowMutationResult,
};
use crate::services::user_service::{
    become_creator, get_all_creators, get_creator_by_username, get_me, get_user_campaigns,
    get_user_profile, update_user, UpdateUserInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/users/me", get(handle_get_me))
        .route("/users/become-creator", post(handle_become_creator))
        .route("/users/creators", get(handle_get_all_creators))
        .route(
            "/users/creator/:username",
            get(handle_get_creator_by_username),
        )
        .route("/users/profile", put(handle_update_user))
        .route(
            "/users/:id/follow",
            post(handle_follow_user).delete(handle_unfollow_user),
        )
        .route("/users/:id/followers", get(handle_get_followers))
        .route("/users/:id/following", get(handle_get_following))
        .route("/users/:id/campaigns", get(handle_get_user_campaigns))
        .route("/users/:id", get(handle_get_user_profile))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateUserRequest {
    #[serde(default)]
    #[validate(length(min = 2, max = 80))]
    name: Option<String>,
    #[serde(default)]
    #[validate(length(min = 3, max = 32))]
    username: Option<String>,
    #[serde(default)]
    #[validate(length(max = 280))]
    bio: Option<String>,
    #[serde(default)]
    #[validate(length(max = 500))]
    creator_bio: Option<String>,
    #[serde(default)]
    #[validate(url)]
    avatar: Option<String>,
    #[serde(default)]
    #[validate(url)]
    banner_image: Option<String>,
    #[serde(default)]
    social_links: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaginationQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn handle_get_me(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<MeProfile>, AppError> {
    let profile = get_me(&state, user_id).await?;
    Ok(Json(profile))
}

async fn handle_become_creator(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<PublicUser>, AppError> {
    let user = become_creator(&state, user_id).await?;
    Ok(Json(user))
}

async fn handle_get_all_creators(
    State(state): State<SharedState>,
) -> Result<Json<CreatorListResponse>, AppError> {
    let creators = get_all_creators(&state).await?;
    Ok(Json(creators))
}

async fn handle_get_creator_by_username(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(username): Path<String>,
) -> Result<Json<CreatorProfile>, AppError> {
    let profile = get_creator_by_username(&state, &username).await?;
    Ok(Json(profile))
}

async fn handle_update_user(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<UpdateUserRequest>,
) -> Result<Json<PublicUser>, AppError> {
    body.validate()?;

    let input = UpdateUserInput {
        name: body.name,
        username: body.username,
        bio: body.bio,
        creator_bio: body.creator_bio,
        avatar: body.avatar,
        banner_image: body.banner_image,
        social_links: body.social_links,
    };

    let user = update_user(&state, user_id, input).await?;
    Ok(Json(user))
}

async fn handle_get_user_profile(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Json<PublicUserProfile>, AppError> {
    let profile = get_user_profile(&state, id).await?;
    Ok(Json(profile))
}

async fn handle_get_user_campaigns(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<CampaignListResponse>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);
    let campaigns = get_user_campaigns(&state, id, page, limit).await?;
    Ok(Json(campaigns))
}

async fn handle_follow_user(
    State(state): State<SharedState>,
    AuthUser {
        id: follower_id, ..
    }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<FollowMutationResult>, AppError> {
    let result = follow_user_action(&state, follower_id, id).await?;
    Ok(Json(result))
}

async fn handle_unfollow_user(
    State(state): State<SharedState>,
    AuthUser {
        id: follower_id, ..
    }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<FollowMutationResult>, AppError> {
    let result = unfollow_user_action(&state, follower_id, id).await?;
    Ok(Json(result))
}

async fn handle_get_followers(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<FollowListResponse>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let response = list_followers(&state, id, page, limit).await?;
    Ok(Json(response))
}

async fn handle_get_following(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<FollowListResponse>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let response = list_following(&state, id, page, limit).await?;
    Ok(Json(response))
}
