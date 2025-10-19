use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::upload_service::{
    upload_image, upload_multiple_images, upload_post_media, upload_video,
    UploadResponse, UploadMultipleResponse,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/upload/image", post(handle_upload_image))
        .route("/upload/video", post(handle_upload_video))
        .route("/upload/images", post(handle_upload_multiple_images))
        .route("/upload/post-media", post(handle_upload_post_media))
}

#[derive(Debug, Serialize)]
struct UploadResponseWrapper {
    success: bool,
    message: String,
    data: Option<UploadResponse>,
}

#[derive(Debug, Serialize)]
struct UploadMultipleResponseWrapper {
    success: bool,
    message: String,
    data: Option<UploadMultipleResponse>,
}

async fn handle_upload_image(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut field = multipart.next_field().await?.ok_or_else(|| {
        AppError::BadRequest("No image field found".to_string())
    })?;

    let filename = field.name().unwrap_or("image").to_string();
    let content_type = field.content_type().unwrap_or("image/jpeg").to_string();
    let data = field.bytes().await?;

    let result = upload_image(&state, user_id, filename, content_type, data.to_vec()).await?;

    Ok(Json(UploadResponseWrapper {
        success: true,
        message: "Image uploaded successfully".to_string(),
        data: Some(result),
    }))
}

async fn handle_upload_video(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut field = multipart.next_field().await?.ok_or_else(|| {
        AppError::BadRequest("No video field found".to_string())
    })?;

    let filename = field.name().unwrap_or("video").to_string();
    let content_type = field.content_type().unwrap_or("video/mp4").to_string();
    let data = field.bytes().await?;

    let result = upload_video(&state, user_id, filename, content_type, data.to_vec()).await?;

    Ok(Json(UploadResponseWrapper {
        success: true,
        message: "Video uploaded successfully".to_string(),
        data: Some(result),
    }))
}

async fn handle_upload_multiple_images(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut images = Vec::new();

    while let Some(field) = multipart.next_field().await? {
        let filename = field.name().unwrap_or("image").to_string();
        let content_type = field.content_type().unwrap_or("image/jpeg").to_string();
        let data = field.bytes().await?;

        images.push((filename, content_type, data.to_vec()));
    }

    let result = upload_multiple_images(&state, user_id, images).await?;

    Ok(Json(UploadMultipleResponseWrapper {
        success: true,
        message: "Images uploaded successfully".to_string(),
        data: Some(result),
    }))
}

async fn handle_upload_post_media(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut images = Vec::new();
    let mut videos = Vec::new();
    let mut attachments = Vec::new();

    while let Some(field) = multipart.next_field().await? {
        let field_name = field.name().unwrap_or("unknown").to_string();
        let filename = field.name().unwrap_or("file").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        let data = field.bytes().await?;

        match field_name.as_str() {
            "images" => images.push((filename, content_type, data.to_vec())),
            "video" => videos.push((filename, content_type, data.to_vec())),
            "attachments" => attachments.push((filename, content_type, data.to_vec())),
            _ => {}
        }
    }

    let result = upload_post_media(&state, user_id, images, videos, attachments).await?;

    Ok(Json(UploadMultipleResponseWrapper {
        success: true,
        message: "Post media uploaded successfully".to_string(),
        data: Some(result),
    }))
}
