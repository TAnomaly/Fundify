use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use uuid::Uuid;

use crate::{
    models::download::{
        CreateDownloadRequest, DownloadResponse, DownloadsListResponse, DownloadHistoryResponse,
        UpdateDownloadRequest,
    },
    state::AppState,
    auth::extractor::AuthUser,
};

pub fn downloads_router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_download))
        .route("/creator/:creator_id", get(get_creator_downloads))
        .route("/:id", get(get_download_by_id))
        .route("/:id/record", post(record_download))
        .route("/:id", put(update_download))
        .route("/:id", delete(delete_download))
        .route("/history/me", get(get_user_download_history))
}

async fn create_download(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(payload): Json<CreateDownloadRequest>,
) -> Result<Json<DownloadResponse>, (StatusCode, Json<serde_json::Value>)> {
    let download_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO downloads (id, title, description, file_url, file_name, file_size, file_type, mime_type, thumbnail_url, is_public, minimum_tier_id, creator_id, download_count, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, $14)",
        download_id,
        payload.title,
        payload.description,
        payload.file_url,
        payload.file_name,
        payload.file_size,
        payload.file_type,
        payload.mime_type,
        payload.thumbnail_url,
        payload.is_public.unwrap_or(true),
        payload.minimum_tier_id,
        user.id,
        now,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to create download"
            })),
        )
    })?;

    // Fetch the created download with creator info
    let download_with_creator = get_download_with_creator(&state, download_id).await?;

    Ok(Json(DownloadResponse {
        success: true,
        message: Some("Download created successfully".to_string()),
        data: Some(download_with_creator),
    }))
}

async fn get_creator_downloads(
    State(state): State<AppState>,
    Path(creator_id): Path<Uuid>,
) -> Result<Json<DownloadsListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let downloads = sqlx::query_as!(
        crate::models::download::Download,
        "SELECT * FROM downloads WHERE creator_id = $1 ORDER BY created_at DESC",
        creator_id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    let mut downloads_with_creator = Vec::new();
    for download in downloads {
        let download_with_creator = get_download_with_creator(&state, download.id).await?;
        downloads_with_creator.push(download_with_creator);
    }

    Ok(Json(DownloadsListResponse {
        success: true,
        data: downloads_with_creator,
    }))
}

async fn get_download_by_id(
    State(state): State<AppState>,
    Path(download_id): Path<Uuid>,
) -> Result<Json<DownloadResponse>, (StatusCode, Json<serde_json::Value>)> {
    let download_with_creator = get_download_with_creator(&state, download_id).await?;

    Ok(Json(DownloadResponse {
        success: true,
        message: None,
        data: Some(download_with_creator),
    }))
}

async fn record_download(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(download_id): Path<Uuid>,
) -> Result<Json<DownloadResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if download exists
    let download = sqlx::query!(
        "SELECT id FROM downloads WHERE id = $1",
        download_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if download.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Download not found"
            })),
        ));
    }

    // Record download
    let history_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query!(
        "INSERT INTO download_history (id, download_id, user_id, downloaded_at) VALUES ($1, $2, $3, $4)",
        history_id,
        download_id,
        user.id,
        now
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to record download"
            })),
        )
    })?;

    // Update download count
    sqlx::query!(
        "UPDATE downloads SET download_count = download_count + 1 WHERE id = $1",
        download_id
    )
    .execute(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Failed to update download count"
            })),
        )
    })?;

    // Fetch updated download with creator info
    let download_with_creator = get_download_with_creator(&state, download_id).await?;

    Ok(Json(DownloadResponse {
        success: true,
        message: Some("Download recorded successfully".to_string()),
        data: Some(download_with_creator),
    }))
}

async fn update_download(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(download_id): Path<Uuid>,
    Json(payload): Json<UpdateDownloadRequest>,
) -> Result<Json<DownloadResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if download exists and user is creator
    let download = sqlx::query!(
        "SELECT id, creator_id FROM downloads WHERE id = $1",
        download_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(download) = download {
        if download.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to update this download"
                })),
            ));
        }

        // Build update query dynamically
        let mut update_fields = Vec::new();
        let mut bind_params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = vec![];
        let mut param_count = 1;

        if let Some(title) = &payload.title {
            update_fields.push(format!("title = ${}", param_count));
            bind_params.push(Box::new(title.clone()));
            param_count += 1;
        }

        if let Some(description) = &payload.description {
            update_fields.push(format!("description = ${}", param_count));
            bind_params.push(Box::new(description.clone()));
            param_count += 1;
        }

        if let Some(file_url) = &payload.file_url {
            update_fields.push(format!("file_url = ${}", param_count));
            bind_params.push(Box::new(file_url.clone()));
            param_count += 1;
        }

        if let Some(file_name) = &payload.file_name {
            update_fields.push(format!("file_name = ${}", param_count));
            bind_params.push(Box::new(file_name.clone()));
            param_count += 1;
        }

        if let Some(file_size) = payload.file_size {
            update_fields.push(format!("file_size = ${}", param_count));
            bind_params.push(Box::new(file_size));
            param_count += 1;
        }

        if let Some(file_type) = &payload.file_type {
            update_fields.push(format!("file_type = ${}", param_count));
            bind_params.push(Box::new(file_type.clone()));
            param_count += 1;
        }

        if let Some(mime_type) = &payload.mime_type {
            update_fields.push(format!("mime_type = ${}", param_count));
            bind_params.push(Box::new(mime_type.clone()));
            param_count += 1;
        }

        if let Some(thumbnail_url) = &payload.thumbnail_url {
            update_fields.push(format!("thumbnail_url = ${}", param_count));
            bind_params.push(Box::new(thumbnail_url.clone()));
            param_count += 1;
        }

        if let Some(is_public) = payload.is_public {
            update_fields.push(format!("is_public = ${}", param_count));
            bind_params.push(Box::new(is_public));
            param_count += 1;
        }

        if let Some(minimum_tier_id) = payload.minimum_tier_id {
            update_fields.push(format!("minimum_tier_id = ${}", param_count));
            bind_params.push(Box::new(minimum_tier_id));
            param_count += 1;
        }

        if update_fields.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "No fields to update"
                })),
            ));
        }

        update_fields.push(format!("updated_at = ${}", param_count));
        bind_params.push(Box::new(chrono::Utc::now()));
        param_count += 1;

        bind_params.push(Box::new(download_id));

        let query = format!(
            "UPDATE downloads SET {} WHERE id = ${}",
            update_fields.join(", "),
            param_count
        );

        // Execute the update
        sqlx::query(&query)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to update download"
                    })),
                )
            })?;

        // Fetch the updated download with creator info
        let download_with_creator = get_download_with_creator(&state, download_id).await?;

        Ok(Json(DownloadResponse {
            success: true,
            message: Some("Download updated successfully".to_string()),
            data: Some(download_with_creator),
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Download not found"
            })),
        ))
    }
}

async fn delete_download(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(download_id): Path<Uuid>,
) -> Result<Json<DownloadResponse>, (StatusCode, Json<serde_json::Value>)> {
    // Check if download exists and user is creator
    let download = sqlx::query!(
        "SELECT id, creator_id FROM downloads WHERE id = $1",
        download_id
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    if let Some(download) = download {
        if download.creator_id != user.id {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "success": false,
                    "message": "Not authorized to delete this download"
                })),
            ));
        }

        // Delete download (cascade will delete history)
        sqlx::query!("DELETE FROM downloads WHERE id = $1", download_id)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "Failed to delete download"
                    })),
                )
            })?;

        Ok(Json(DownloadResponse {
            success: true,
            message: Some("Download deleted successfully".to_string()),
            data: None,
        }))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "Download not found"
            })),
        ))
    }
}

async fn get_user_download_history(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> Result<Json<DownloadHistoryResponse>, (StatusCode, Json<serde_json::Value>)> {
    let history = sqlx::query_as!(
        crate::models::download::DownloadHistoryItem,
        r#"
        SELECT 
            dh.id,
            dh.download_id,
            dh.user_id,
            dh.downloaded_at,
            d.id as "download_id",
            d.title as "download_title",
            d.description as "download_description",
            d.file_url as "download_file_url",
            d.file_name as "download_file_name",
            d.file_size as "download_file_size",
            d.file_type as "download_file_type",
            d.mime_type as "download_mime_type",
            d.thumbnail_url as "download_thumbnail_url",
            d.is_public as "download_is_public",
            d.minimum_tier_id as "download_minimum_tier_id",
            d.creator_id as "download_creator_id",
            d.download_count as "download_download_count",
            d.created_at as "download_created_at",
            d.updated_at as "download_updated_at",
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar"
        FROM download_history dh
        JOIN downloads d ON dh.download_id = d.id
        JOIN users u ON d.creator_id = u.id
        WHERE dh.user_id = $1
        ORDER BY dh.downloaded_at DESC
        "#,
        user.id
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(Json(DownloadHistoryResponse {
        success: true,
        data: history,
    }))
}

async fn get_download_with_creator(
    state: &AppState,
    download_id: Uuid,
) -> Result<crate::models::download::DownloadWithCreator, (StatusCode, Json<serde_json::Value>)> {
    let download = sqlx::query_as!(
        crate::models::download::DownloadWithCreator,
        r#"
        SELECT 
            d.id,
            d.title,
            d.description,
            d.file_url,
            d.file_name,
            d.file_size,
            d.file_type,
            d.mime_type,
            d.thumbnail_url,
            d.is_public,
            d.minimum_tier_id,
            d.creator_id,
            d.download_count,
            d.created_at,
            d.updated_at,
            u.id as "creator_id",
            u.name as "creator_name",
            u.avatar as "creator_avatar"
        FROM downloads d
        JOIN users u ON d.creator_id = u.id
        WHERE d.id = $1
        "#,
        download_id
    )
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "Database error"
            })),
        )
    })?;

    Ok(download)
}
