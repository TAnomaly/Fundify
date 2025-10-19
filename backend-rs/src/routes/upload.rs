use std::collections::HashMap;

use anyhow::anyhow;
use axum::{
    extract::{multipart::MultipartError, Multipart, State},
    routing::post,
    Json, Router,
};
use bytes::Bytes;
use serde_json::json;
use tracing::instrument;

use crate::{
    auth::AuthUser,
    error::AppError,
    media_service::{MediaKind, MediaSaveRequest, MediaSaveResult},
    state::AppState,
};

const MAX_FILES: usize = 10;

const ALLOWED_IMAGE_TYPES: &[&str] = &[
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
];

const IMAGE_EXTENSIONS: &[&str] = &[".jpg", ".jpeg", ".png", ".gif", ".webp"];

const ALLOWED_VIDEO_TYPES: &[&str] = &[
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "application/octet-stream",
];

const VIDEO_EXTENSIONS: &[&str] = &[".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".m4v"];

const ALLOWED_FILE_TYPES: &[&str] = &["application/pdf", "application/zip", "text/plain"];

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/image", post(upload_image))
        .route("/video", post(upload_video))
        .route("/images", post(upload_multiple_images))
        .route("/post-media", post(upload_post_media))
}

#[instrument(skip(state, auth_user, multipart))]
async fn upload_image(
    State(state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_authenticated(&auth_user)?;

    let file = extract_single_file(&mut multipart, "image").await?;
    validate_file(&file, MediaKind::Image)?;

    let saved = state
        .media
        .save(MediaSaveRequest {
            file_name: file.file_name,
            content_type: file.content_type.clone(),
            bytes: file.bytes,
            kind: MediaKind::Image,
        })
        .await?
        .into_json();

    Ok(Json(json!({ "success": true, "data": saved })))
}

#[instrument(skip(state, auth_user, multipart))]
async fn upload_video(
    State(state): State<AppState>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_authenticated(&auth_user)?;

    let file = extract_single_file(&mut multipart, "video").await?;
    validate_file(&file, MediaKind::Video)?;

    let saved = state
        .media
        .save(MediaSaveRequest {
            file_name: file.file_name,
            content_type: file.content_type.clone(),
            bytes: file.bytes,
            kind: MediaKind::Video,
        })
        .await?
        .into_json();

    Ok(Json(json!({ "success": true, "data": saved })))
}

#[instrument(skip(state, auth_user, multipart))]
async fn upload_multiple_images(
    State(state): State<AppState>,
    auth_user: AuthUser,
    multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_authenticated(&auth_user)?;

    let files = extract_files(multipart, Some("images"), MAX_FILES).await?;
    if files.is_empty() {
        return Err(AppError::BadRequest("No files uploaded".into()));
    }

    let mut uploads = Vec::new();
    for file in files {
        validate_file(&file, MediaKind::Image)?;
        let saved = state
            .media
            .save(MediaSaveRequest {
                file_name: file.file_name,
                content_type: file.content_type.clone(),
                bytes: file.bytes,
                kind: MediaKind::Image,
            })
            .await?
            .into_json();
        uploads.push(saved);
    }

    Ok(Json(json!({ "success": true, "data": uploads })))
}

#[instrument(skip(state, auth_user, multipart))]
async fn upload_post_media(
    State(state): State<AppState>,
    auth_user: AuthUser,
    multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    ensure_authenticated(&auth_user)?;

    let files_map = extract_all_files(multipart).await?;
    if files_map.is_empty() {
        return Err(AppError::BadRequest("No files uploaded".into()));
    }

    let mut images = Vec::new();
    if let Some(image_files) = files_map.get("images") {
        for file in image_files {
            validate_file(file, MediaKind::Image)?;
            let saved = state
                .media
                .save(MediaSaveRequest {
                    file_name: file.file_name.clone(),
                    content_type: file.content_type.clone(),
                    bytes: file.bytes.clone(),
                    kind: MediaKind::Image,
                })
                .await?
                .into_json();
            images.push(saved);
        }
    }

    let mut video_json = None;
    if let Some(video_files) = files_map.get("video") {
        if let Some(file) = video_files.first() {
            validate_file(file, MediaKind::Video)?;
            let saved = state
                .media
                .save(MediaSaveRequest {
                    file_name: file.file_name.clone(),
                    content_type: file.content_type.clone(),
                    bytes: file.bytes.clone(),
                    kind: MediaKind::Video,
                })
                .await?
                .into_json();
            video_json = Some(saved);
        }
    }

    let mut attachments = Vec::new();
    if let Some(att_files) = files_map.get("attachments") {
        for file in att_files {
            validate_file(file, MediaKind::File)?;
            let saved = state
                .media
                .save(MediaSaveRequest {
                    file_name: file.file_name.clone(),
                    content_type: file.content_type.clone(),
                    bytes: file.bytes.clone(),
                    kind: MediaKind::File,
                })
                .await?
                .into_json();
            attachments.push(saved);
        }
    }

    Ok(Json(json!({
        "success": true,
        "data": {
            "images": images,
            "video": video_json,
            "attachments": attachments,
        }
    })))
}

fn ensure_authenticated(auth_user: &AuthUser) -> Result<(), AppError> {
    if auth_user.0.user_id.is_empty() {
        Err(AppError::Auth("Unauthorized".into()))
    } else {
        Ok(())
    }
}

fn validate_file(file: &UploadedFile, kind: MediaKind) -> Result<(), AppError> {
    let mime = file
        .content_type
        .as_deref()
        .unwrap_or("application/octet-stream");
    let ext = file.extension();
    match kind {
        MediaKind::Image => {
            if !ALLOWED_IMAGE_TYPES.contains(&mime) && !IMAGE_EXTENSIONS.contains(&ext.as_str()) {
                return Err(AppError::BadRequest("Invalid image type".into()));
            }
        }
        MediaKind::Video => {
            if !ALLOWED_VIDEO_TYPES.contains(&mime) && !VIDEO_EXTENSIONS.contains(&ext.as_str()) {
                return Err(AppError::BadRequest("Invalid video type".into()));
            }
        }
        MediaKind::File => {
            if !ALLOWED_FILE_TYPES.contains(&mime) {
                return Err(AppError::BadRequest("Invalid attachment type".into()));
            }
        }
    }
    Ok(())
}

async fn extract_single_file(
    multipart: &mut Multipart,
    field: &str,
) -> Result<UploadedFile, AppError> {
    while let Some(field_item) = multipart
        .next_field()
        .await
        .map_err(|e: MultipartError| AppError::Other(anyhow!(e)))?
    {
        let name = field_item.name().map(|s| s.to_string());
        if name.as_deref() != Some(field) {
            continue;
        }

        let file_name = field_item
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "upload".to_string());
        let content_type = field_item.content_type().map(|ct| ct.to_string());
        let bytes = field_item
            .bytes()
            .await
            .map_err(|e: MultipartError| AppError::Other(anyhow!(e)))?;

        return Ok(UploadedFile {
            file_name,
            content_type,
            bytes,
        });
    }

    Err(AppError::BadRequest("No file uploaded".into()))
}

async fn extract_files(
    multipart: Multipart,
    field: Option<&str>,
    max_files: usize,
) -> Result<Vec<UploadedFile>, AppError> {
    let mut files = Vec::new();
    let mut stream = multipart;
    while let Some(field_item) = stream
        .next_field()
        .await
        .map_err(|e: MultipartError| AppError::Other(anyhow!(e)))?
    {
        if let Some(expected) = field {
            if field_item.name() != Some(expected) {
                continue;
            }
        }

        if files.len() >= max_files {
            return Err(AppError::BadRequest("Too many files uploaded".into()));
        }

        let file_name = field_item
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "upload".to_string());
        let content_type = field_item.content_type().map(|ct| ct.to_string());
        let bytes = field_item
            .bytes()
            .await
            .map_err(|e: MultipartError| AppError::Other(anyhow!(e)))?;

        files.push(UploadedFile {
            file_name,
            content_type,
            bytes,
        });
    }
    Ok(files)
}

async fn extract_all_files(
    multipart: Multipart,
) -> Result<HashMap<String, Vec<UploadedFile>>, AppError> {
    let mut map: HashMap<String, Vec<UploadedFile>> = HashMap::new();
    let mut stream = multipart;
    while let Some(field_item) = stream
        .next_field()
        .await
        .map_err(|e: MultipartError| AppError::Other(anyhow!(e)))?
    {
        let field_name = field_item
            .name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "file".to_string());
        let file_name = field_item
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "upload".to_string());
        let content_type = field_item.content_type().map(|ct| ct.to_string());
        let bytes = field_item
            .bytes()
            .await
            .map_err(|e: MultipartError| AppError::Other(anyhow!(e)))?;

        map.entry(field_name).or_default().push(UploadedFile {
            file_name,
            content_type,
            bytes,
        });
    }
    Ok(map)
}

#[derive(Clone)]
struct UploadedFile {
    file_name: String,
    content_type: Option<String>,
    bytes: Bytes,
}

impl UploadedFile {
    fn extension(&self) -> String {
        std::path::Path::new(&self.file_name)
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| format!(".{}", s.to_lowercase()))
            .unwrap_or_default()
    }
}

trait IntoUploadJson {
    fn into_json(self) -> serde_json::Value;
}

impl IntoUploadJson for MediaSaveResult {
    fn into_json(self) -> serde_json::Value {
        json!({
            "url": self.url,
            "storedFileName": self.stored_file_name,
            "size": self.size,
            "mimetype": self.mime,
        })
    }
}
