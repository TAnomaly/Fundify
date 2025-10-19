use crate::error::AppError;
use crate::models::podcast::{
    Podcast, PodcastEpisode, PodcastEpisodeListResponse, PodcastListResponse, PodcastSummary,
};
use crate::state::AppState;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct PodcastCreateInput {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub language: Option<String>,
    pub cover_image: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PodcastEpisodeCreateInput {
    pub title: String,
    pub description: Option<String>,
    pub episode_number: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub audio_url: String,
    pub status: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
}

pub async fn create_podcast(
    state: &AppState,
    creator_id: Uuid,
    input: PodcastCreateInput,
) -> Result<Podcast, AppError> {
    let status = input.status.unwrap_or_else(|| "DRAFT".to_string());
    let podcast = sqlx::query_as::<_, Podcast>(
        r#"
        INSERT INTO podcasts (
            id,
            creator_id,
            title,
            description,
            category,
            language,
            cover_image,
            status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::text
        )
        RETURNING id, creator_id, title, description, category, language, cover_image, status, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(creator_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.category)
    .bind(&input.language)
    .bind(&input.cover_image)
    .bind(&status)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(podcast)
}

pub async fn list_podcasts_by_creator(
    state: &AppState,
    creator_id: Uuid,
) -> Result<PodcastListResponse, AppError> {
    let podcasts = sqlx::query_as::<_, PodcastSummary>(
        r#"
        SELECT id, creator_id, title, description, category, language, cover_image, status, created_at, updated_at
        FROM podcasts
        WHERE creator_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(creator_id)
    .fetch_all(&state.db_pool)
    .await?;

    Ok(PodcastListResponse { podcasts })
}

pub async fn list_my_podcasts(
    state: &AppState,
    creator_id: Uuid,
) -> Result<PodcastListResponse, AppError> {
    list_podcasts_by_creator(state, creator_id).await
}

pub async fn get_podcast(state: &AppState, podcast_id: Uuid) -> Result<Podcast, AppError> {
    let podcast = sqlx::query_as::<_, Podcast>(
        r#"
        SELECT id, creator_id, title, description, category, language, cover_image, status, created_at, updated_at
        FROM podcasts
        WHERE id = $1
        "#,
    )
    .bind(podcast_id)
    .fetch_optional(&state.db_pool)
    .await?;

    podcast.ok_or(AppError::NotFound("Podcast not found".to_string()))
}

pub async fn create_episode(
    state: &AppState,
    podcast_id: Uuid,
    creator_id: Uuid,
    input: PodcastEpisodeCreateInput,
) -> Result<PodcastEpisode, AppError> {
    // ensure the podcast belongs to the creator
    sqlx::query_scalar::<_, Uuid>("SELECT id FROM podcasts WHERE id = $1 AND creator_id = $2")
        .bind(podcast_id)
        .bind(creator_id)
        .fetch_optional(&state.db_pool)
        .await?
        .ok_or(AppError::NotFound("Episode not found".to_string()))?;

    let status = input.status.unwrap_or_else(|| "DRAFT".to_string());

    let episode = sqlx::query_as::<_, PodcastEpisode>(
        r#"
        INSERT INTO podcast_episodes (
            id,
            podcast_id,
            title,
            description,
            episode_number,
            duration_seconds,
            audio_url,
            status,
            published_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::text, $9
        )
        RETURNING id, podcast_id, title, description, episode_number, duration_seconds, audio_url, status, published_at, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(podcast_id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&input.episode_number)
    .bind(&input.duration_seconds)
    .bind(&input.audio_url)
    .bind(&status)
    .bind(&input.published_at)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(episode)
}

pub async fn list_podcast_episodes(
    state: &AppState,
    podcast_id: Uuid,
) -> Result<PodcastEpisodeListResponse, AppError> {
    let episodes = sqlx::query_as::<_, PodcastEpisode>(
        r#"
        SELECT id, podcast_id, title, description, episode_number, duration_seconds, audio_url, status, published_at, created_at, updated_at
        FROM podcast_episodes
        WHERE podcast_id = $1
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        "#,
    )
    .bind(podcast_id)
    .fetch_all(&state.db_pool)
    .await?;

    Ok(PodcastEpisodeListResponse { episodes })
}
