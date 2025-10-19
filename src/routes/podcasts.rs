use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::models::podcast::{
    Podcast, PodcastEpisode, PodcastEpisodeListResponse, PodcastListResponse,
};
use crate::services::podcast_service::{
    create_episode, create_podcast, get_podcast, list_my_podcasts, list_podcast_episodes,
    list_podcasts_by_creator, PodcastCreateInput, PodcastEpisodeCreateInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route(
            "/podcasts",
            post(handle_create_podcast).get(handle_list_creator_podcasts),
        )
        .route("/podcasts/my", get(handle_list_my_podcasts))
        .route("/podcasts/:id", get(handle_get_podcast))
        .route(
            "/podcasts/:id/episodes",
            get(handle_list_podcast_episodes).post(handle_create_episode),
        )
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct PodcastRequest {
    #[validate(length(min = 3, max = 160))]
    title: String,
    #[serde(default)]
    #[validate(length(max = 2000))]
    description: Option<String>,
    #[serde(default)]
    #[validate(length(max = 120))]
    category: Option<String>,
    #[serde(default)]
    #[validate(length(max = 60))]
    language: Option<String>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    status: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct PodcastEpisodeRequest {
    #[validate(length(min = 3, max = 160))]
    title: String,
    #[serde(default)]
    #[validate(length(max = 2000))]
    description: Option<String>,
    #[serde(default)]
    episode_number: Option<i32>,
    #[serde(default)]
    duration_seconds: Option<i32>,
    #[validate(url)]
    audio_url: String,
    #[serde(default)]
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreatorQuery {
    creator_id: Uuid,
}

async fn handle_create_podcast(
    State(state): State<SharedState>,
    AuthUser { id: creator_id, .. }: AuthUser,
    Json(body): Json<PodcastRequest>,
) -> Result<Json<Podcast>, AppError> {
    body.validate()?;

    let input = PodcastCreateInput {
        title: body.title,
        description: body.description,
        category: body.category,
        language: body.language,
        cover_image: body.cover_image,
        status: body.status.map(|s| s.to_ascii_uppercase()),
    };

    let podcast = create_podcast(&state, creator_id, input).await?;
    Ok(Json(podcast))
}

async fn handle_list_creator_podcasts(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Query(query): Query<CreatorQuery>,
) -> Result<Json<PodcastListResponse>, AppError> {
    let response = list_podcasts_by_creator(&state, query.creator_id).await?;
    Ok(Json(response))
}

async fn handle_list_my_podcasts(
    State(state): State<SharedState>,
    AuthUser { id: creator_id, .. }: AuthUser,
) -> Result<Json<PodcastListResponse>, AppError> {
    let response = list_my_podcasts(&state, creator_id).await?;
    Ok(Json(response))
}

async fn handle_get_podcast(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Podcast>, AppError> {
    let podcast = get_podcast(&state, id).await?;
    Ok(Json(podcast))
}

async fn handle_list_podcast_episodes(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Json<PodcastEpisodeListResponse>, AppError> {
    let episodes = list_podcast_episodes(&state, id).await?;
    Ok(Json(episodes))
}

async fn handle_create_episode(
    State(state): State<SharedState>,
    AuthUser { id: creator_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<PodcastEpisodeRequest>,
) -> Result<Json<PodcastEpisode>, AppError> {
    body.validate()?;

    let input = PodcastEpisodeCreateInput {
        title: body.title,
        description: body.description,
        episode_number: body.episode_number,
        duration_seconds: body.duration_seconds,
        audio_url: body.audio_url,
        status: body.status.map(|s| s.to_ascii_uppercase()),
        published_at: None,
    };

    let episode = create_episode(&state, id, creator_id, input).await?;
    Ok(Json(episode))
}
