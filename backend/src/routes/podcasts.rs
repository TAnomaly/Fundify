use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{postgres::PgRow, Postgres, QueryBuilder, Row};
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PodcastQuery {
    pub page: Option<u32>,
    #[serde(alias = "pageSize")]
    pub limit: Option<u32>,
    pub creator_id: Option<String>,
    pub include_drafts: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PodcastEpisodesQuery {
    pub include_drafts: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePodcastRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub language: Option<String>,
    pub status: Option<String>,
    #[serde(alias = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(alias = "spotifyShowUrl")]
    pub spotify_show_url: Option<String>,
    #[serde(alias = "externalFeedUrl")]
    pub external_feed_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateEpisodeRequest {
    pub title: String,
    pub description: Option<String>,
    #[serde(alias = "episodeNumber")]
    pub episode_number: Option<String>,
    pub duration: Option<i32>,
    #[serde(alias = "audioUrl")]
    pub audio_url: String,
    pub status: Option<String>,
    #[serde(alias = "spotifyEpisodeUrl")]
    pub spotify_episode_url: Option<String>,
    #[serde(alias = "publishedAt")]
    pub published_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PodcastCounts {
    pub episodes: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PodcastResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub language: String,
    pub status: String,
    pub cover_image: Option<String>,
    pub spotify_show_url: Option<String>,
    pub external_feed_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator_id: String,
    pub _count: PodcastCounts,
}

impl PodcastResponse {
    fn from_row(row: &PgRow) -> Self {
        PodcastResponse {
            id: row.get("id"),
            title: row.get("title"),
            description: row.try_get("description").unwrap_or(None),
            category: row
                .try_get::<Option<String>, _>("category")
                .unwrap_or(Some("Technology".to_string()))
                .unwrap_or_else(|| "Technology".to_string()),
            language: row
                .try_get::<Option<String>, _>("language")
                .unwrap_or(Some("English".to_string()))
                .unwrap_or_else(|| "English".to_string()),
            status: row
                .try_get::<Option<String>, _>("status")
                .unwrap_or(Some("PUBLISHED".to_string()))
                .unwrap_or_else(|| "PUBLISHED".to_string()),
            cover_image: row.try_get("cover_image").unwrap_or(None),
            spotify_show_url: row.try_get("spotify_show_url").unwrap_or(None),
            external_feed_url: row.try_get("external_feed_url").unwrap_or(None),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            creator_id: row.get("creator_id"),
            _count: PodcastCounts {
                episodes: row
                    .try_get::<Option<i64>, _>("episode_count")
                    .unwrap_or(Some(0))
                    .unwrap_or(0),
            },
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PodcastEpisodeResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    #[serde(alias = "episodeNumber")]
    pub episode_number: Option<i32>,
    pub duration: Option<i32>,
    pub status: String,
    #[serde(alias = "audioUrl")]
    pub audio_url: String,
    #[serde(alias = "spotifyEpisodeUrl")]
    pub spotify_episode_url: Option<String>,
    #[serde(alias = "publishedAt")]
    pub published_at: Option<DateTime<Utc>>,
    #[serde(alias = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(alias = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

impl PodcastEpisodeResponse {
    fn from_row(row: &PgRow) -> Self {
        PodcastEpisodeResponse {
            id: row.get("id"),
            title: row.get("title"),
            description: row.try_get("description").unwrap_or(None),
            episode_number: row.try_get("episode_number").unwrap_or(None),
            duration: row.try_get("duration").unwrap_or(None),
            status: row
                .try_get::<Option<String>, _>("status")
                .unwrap_or(Some("PUBLISHED".to_string()))
                .unwrap_or_else(|| "PUBLISHED".to_string()),
            audio_url: row.get("audio_url"),
            spotify_episode_url: row.try_get("spotify_episode_url").unwrap_or(None),
            published_at: row.try_get("published_at").unwrap_or(None),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }
    }
}

pub fn podcast_routes() -> Router<Database> {
    Router::new()
        .route("/", get(get_podcasts).post(create_podcast))
        .route(
            "/:podcast_id/episodes",
            get(get_podcast_episodes).post(create_podcast_episode),
        )
}

async fn get_podcasts(
    State(db): State<Database>,
    Query(params): Query<PodcastQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).max(1);
    let offset = (page - 1) * limit;
    let include_drafts = params.include_drafts.unwrap_or(false);
    let creator_id = params.creator_id.clone();

    let mut count_builder =
        QueryBuilder::<Postgres>::new("SELECT COUNT(*)::BIGINT FROM podcasts p");
    {
        let mut separated = count_builder.separated(" WHERE ");
        if let Some(ref creator_id) = creator_id {
            separated.push("p.creator_id = ").push_bind(creator_id);
        }
        if !include_drafts {
            separated.push("p.status = 'PUBLISHED'");
        }
    }

    let total_row = count_builder
        .build()
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count podcasts: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    let total_items: i64 = total_row.get::<i64, _>(0);

    let mut list_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            p.id,
            p.title,
            p.description,
            p.category,
            p.language,
            p.status,
            p.cover_image,
            p.spotify_show_url,
            p.external_feed_url,
            p.created_at,
            p.updated_at,
            p.creator_id,
            COALESCE(e.episode_count, 0) AS episode_count
        FROM podcasts p
        LEFT JOIN (
            SELECT podcast_id, COUNT(*) AS episode_count
            FROM podcast_episodes
            GROUP BY podcast_id
        ) e ON e.podcast_id = p.id
        "#,
    );

    {
        let mut separated = list_builder.separated(" WHERE ");
        if let Some(ref creator_id) = creator_id {
            separated.push("p.creator_id = ").push_bind(creator_id);
        }
        if !include_drafts {
            separated.push("p.status = 'PUBLISHED'");
        }
    }

    list_builder
        .push(" ORDER BY p.created_at DESC LIMIT ")
        .push_bind(limit as i64)
        .push(" OFFSET ")
        .push_bind(offset as i64);

    let rows = list_builder
        .build()
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch podcasts: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let podcasts: Vec<PodcastResponse> = rows.iter().map(PodcastResponse::from_row).collect();
    let total_pages = ((total_items as f64) / (limit as f64)).ceil() as i64;

    Ok(Json(json!({
        "success": true,
        "data": {
            "podcasts": podcasts,
            "pagination": {
                "page": page,
                "pageSize": limit,
                "totalItems": total_items,
                "totalPages": total_pages.max(1)
            }
        }
    })))
}

async fn get_podcast_episodes(
    State(db): State<Database>,
    Path(podcast_id): Path<Uuid>,
    Query(params): Query<PodcastEpisodesQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let include_drafts = params.include_drafts.unwrap_or(false);

    let mut query_builder = QueryBuilder::<Postgres>::new(
        r#"
        SELECT
            pe.id,
            pe.title,
            pe.description,
            pe.episode_number,
            pe.duration,
            pe.status,
            pe.audio_url,
            pe.spotify_episode_url,
            pe.published_at,
            pe.created_at,
            pe.updated_at
        FROM podcast_episodes pe
        WHERE pe.podcast_id = 
        "#,
    );

    query_builder.push_bind(podcast_id);

    if !include_drafts {
        query_builder.push(" AND pe.status = 'PUBLISHED'");
    }

    query_builder.push(" ORDER BY COALESCE(pe.episode_number, 0) DESC, pe.created_at DESC");

    let rows = query_builder
        .build()
        .fetch_all(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch podcast episodes: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let episodes: Vec<PodcastEpisodeResponse> =
        rows.iter().map(PodcastEpisodeResponse::from_row).collect();

    Ok(Json(json!({
        "success": true,
        "data": {
            "episodes": episodes
        }
    })))
}

async fn create_podcast(
    State(db): State<Database>,
    claims: Claims,
    Json(payload): Json<CreatePodcastRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let is_creator = sqlx::query_scalar::<_, bool>("SELECT is_creator FROM users WHERE id = $1")
        .bind(&claims.sub)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to verify creator status: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if !is_creator {
        return Err(StatusCode::FORBIDDEN);
    }

    let query = r#"
        INSERT INTO podcasts (
            id,
            creator_id,
            title,
            description,
            category,
            language,
            status,
            cover_image,
            spotify_show_url,
            external_feed_url,
            created_at,
            updated_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            NOW(),
            NOW()
        )
        RETURNING
            id,
            title,
            description,
            category,
            language,
            status,
            cover_image,
            spotify_show_url,
            external_feed_url,
            created_at,
            updated_at,
            creator_id,
            0::BIGINT AS episode_count
    "#;

    let podcast_id = Uuid::new_v4();

    let row = sqlx::query(query)
        .bind(podcast_id)
        .bind(&claims.sub)
        .bind(&payload.title)
        .bind(&payload.description)
        .bind(
            payload
                .category
                .clone()
                .unwrap_or_else(|| "Technology".to_string()),
        )
        .bind(
            payload
                .language
                .clone()
                .unwrap_or_else(|| "English".to_string()),
        )
        .bind(
            payload
                .status
                .clone()
                .unwrap_or_else(|| "PUBLISHED".to_string()),
        )
        .bind(payload.cover_image.clone())
        .bind(payload.spotify_show_url.clone())
        .bind(payload.external_feed_url.clone())
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create podcast: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "podcast": PodcastResponse::from_row(&row)
        }
    })))
}

async fn create_podcast_episode(
    State(db): State<Database>,
    Path(podcast_id): Path<Uuid>,
    claims: Claims,
    Json(payload): Json<CreateEpisodeRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let owner = sqlx::query_scalar::<_, Option<String>>(
        "SELECT creator_id FROM podcasts WHERE id = $1 LIMIT 1",
    )
    .bind(podcast_id)
    .fetch_one(&db.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to load podcast owner: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let Some(owner_id) = owner else {
        return Err(StatusCode::NOT_FOUND);
    };

    if owner_id != claims.sub {
        return Err(StatusCode::FORBIDDEN);
    }

    let episode_number = payload
        .episode_number
        .as_ref()
        .and_then(|value| value.trim().parse::<i32>().ok());

    let published_at = match payload.published_at.as_ref() {
        Some(raw) => Some(
            DateTime::parse_from_rfc3339(raw)
                .map_err(|_| StatusCode::BAD_REQUEST)?
                .with_timezone(&Utc),
        ),
        None => None,
    };

    let query = r#"
        INSERT INTO podcast_episodes (
            id,
            podcast_id,
            title,
            description,
            episode_number,
            duration,
            audio_url,
            status,
            spotify_episode_url,
            published_at,
            created_at,
            updated_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            NOW(),
            NOW()
        )
        RETURNING
            id,
            title,
            description,
            episode_number,
            duration,
            status,
            audio_url,
            spotify_episode_url,
            published_at,
            created_at,
            updated_at
    "#;

    let episode_id = Uuid::new_v4();

    let row = sqlx::query(query)
        .bind(episode_id)
        .bind(podcast_id)
        .bind(&payload.title)
        .bind(&payload.description)
        .bind(episode_number)
        .bind(payload.duration)
        .bind(&payload.audio_url)
        .bind(
            payload
                .status
                .clone()
                .unwrap_or_else(|| "PUBLISHED".to_string()),
        )
        .bind(payload.spotify_episode_url.clone())
        .bind(published_at)
        .fetch_one(&db.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create podcast episode: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "episode": PodcastEpisodeResponse::from_row(&row)
        }
    })))
}
