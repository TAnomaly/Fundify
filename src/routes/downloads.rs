use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::services::download_service::{
    create_download, delete_download, get_creator_downloads, get_download_by_id,
    get_user_download_history, record_download, update_download,
    DownloadCreateRequest, DownloadResponse, DownloadUpdateRequest,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/downloads", post(handle_create_download))
        .route("/downloads/creator/:creator_id", get(handle_get_creator_downloads))
        .route("/downloads/:id", get(handle_get_download_by_id).put(handle_update_download).delete(handle_delete_download))
        .route("/downloads/:id/record", post(handle_record_download))
        .route("/downloads/history/me", get(handle_get_user_download_history))
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CreateDownloadRequest {
    #[validate(length(min = 3, max = 200))]
    title: String,
    #[validate(length(min = 10, max = 1000))]
    description: String,
    #[validate(url)]
    file_url: String,
    #[validate(length(min = 3, max = 50))]
    file_type: String,
    #[validate(range(min = 1))]
    file_size: u64,
    #[serde(default)]
    is_public: bool,
    #[serde(default)]
    requires_subscription: bool,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateDownloadRequest {
    #[validate(length(min = 3, max = 200))]
    title: Option<String>,
    #[validate(length(min = 10, max = 1000))]
    description: Option<String>,
    #[validate(url)]
    file_url: Option<String>,
    #[validate(length(min = 3, max = 50))]
    file_type: Option<String>,
    #[validate(range(min = 1))]
    file_size: Option<u64>,
    #[serde(default)]
    is_public: Option<bool>,
    #[serde(default)]
    requires_subscription: Option<bool>,
    #[serde(default)]
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CreatorDownloadsQuery {
    page: Option<u32>,
    limit: Option<u32>,
    file_type: Option<String>,
    is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct DownloadHistoryQuery {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn handle_create_download(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<CreateDownloadRequest>,
) -> Result<impl IntoResponse, AppError> {
    body.validate()?;

    let input = DownloadCreateRequest {
        title: body.title,
        description: body.description,
        file_url: body.file_url,
        file_type: body.file_type,
        file_size: body.file_size,
        is_public: body.is_public,
        requires_subscription: body.requires_subscription,
        tags: body.tags,
        creator_id: user_id,
    };

    let download = create_download(&state, input).await?;
    Ok((StatusCode::CREATED, Json(download)))
}

async fn handle_get_creator_downloads(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(creator_id): Path<Uuid>,
    Query(query): Query<CreatorDownloadsQuery>,
) -> Result<Json<Vec<DownloadResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let downloads = get_creator_downloads(&state, creator_id, page, limit, query.file_type, query.is_public).await?;
    Ok(Json(downloads))
}

async fn handle_get_download_by_id(
    State(state): State<SharedState>,
    OptionalAuthUser(_viewer): OptionalAuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<DownloadResponse>, AppError> {
    let download = get_download_by_id(&state, id).await?;
    Ok(Json(download))
}

async fn handle_update_download(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateDownloadRequest>,
) -> Result<Json<DownloadResponse>, AppError> {
    body.validate()?;

    let input = DownloadUpdateRequest {
        title: body.title,
        description: body.description,
        file_url: body.file_url,
        file_type: body.file_type,
        file_size: body.file_size,
        is_public: body.is_public,
        requires_subscription: body.requires_subscription,
        tags: body.tags,
    };

    let download = update_download(&state, user_id, id, input).await?;
    Ok(Json(download))
}

async fn handle_delete_download(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    delete_download(&state, user_id, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn handle_record_download(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    record_download(&state, user_id, id).await?;
    Ok(StatusCode::OK)
}

async fn handle_get_user_download_history(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<DownloadHistoryQuery>,
) -> Result<Json<Vec<DownloadResponse>>, AppError> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let downloads = get_user_download_history(&state, user_id, page, limit).await?;
    Ok(Json(downloads))
}
