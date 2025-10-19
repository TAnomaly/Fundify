use axum::{extract::{DefaultBodyLimit, Multipart, State}, routing::post, Json, Router};
use futures::stream::TryStreamExt;
use uuid::Uuid;

use crate::{auth::AuthUser, error::AppError, media_service::MediaService, state::AppState};

const TEN_MB: usize = 10 * 1024 * 1024;

pub fn uploads_router() -> Router<AppState> {
    Router::new()
        .route("/image", post(upload_single_image))
        .route("/video", post(upload_single_video))
        .route("/images", post(upload_multiple_images))
        .route("/post-media", post(upload_post_media))
        .layer(DefaultBodyLimit::max(TEN_MB))
}

async fn upload_single_image(
    State(state): State<AppState>,
    _user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let field = multipart
        .next_field()
        .await?
        .ok_or_else(|| AppError::BadRequest("No image uploaded".to_string()))?;

    let content_type = field.content_type().map(str::to_string).unwrap_or_default();
    let data = field.bytes().await?;
    let file_name = format!("images/{}", Uuid::new_v4());

    let url = state
        .media
        .upload(data.to_vec(), &file_name, &content_type)
        .await?;

    Ok(Json(serde_json::json!({ "url": url })))
}

async fn upload_single_video(
    State(state): State<AppState>,
    _user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let field = multipart
        .next_field()
        .await?
        .ok_or_else(|| AppError::BadRequest("No video uploaded".to_string()))?;

    let content_type = field.content_type().map(str::to_string).unwrap_or_default();
    let data = field.bytes().await?;
    let file_name = format!("videos/{}", Uuid::new_v4());

    let url = state
        .media
        .upload(data.to_vec(), &file_name, &content_type)
        .await?;

    Ok(Json(serde_json::json!({ "url": url })))
}

async fn upload_multiple_images(
    State(state): State<AppState>,
    _user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut urls = Vec::new();
    while let Some(field) = multipart.next_field().await? {
        let content_type = field.content_type().map(str::to_string).unwrap_or_default();
        let data = field.bytes().await?;
        let file_name = format!("images/{}", Uuid::new_v4());

        let url = state
            .media
            .upload(data.to_vec(), &file_name, &content_type)
            .await?;
        urls.push(url);
    }
    Ok(Json(serde_json::json!({ "urls": urls })))
}

#[derive(serde::Serialize)]
struct PostMediaResult {
    video_url: Option<String>,
    image_urls: Vec<String>,
    attachment_urls: Vec<String>,
}

async fn upload_post_media(
    State(state): State<AppState>,
    _user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<PostMediaResult>, AppError> {
    let mut result = PostMediaResult {
        video_url: None,
        image_urls: Vec::new(),
        attachment_urls: Vec::new(),
    };

    while let Some(field) = multipart.next_field().await? {
        let name = if let Some(name) = field.name() {
            name.to_string()
        } else {
            continue;
        };
        let content_type = field.content_type().map(str::to_string).unwrap_or_default();
        let data = field.bytes().await?;

        match name.as_str() {
            "video" => {
                let file_name = format!("videos/{}", Uuid::new_v4());
                let url = state
                    .media
                    .upload(data.to_vec(), &file_name, &content_type)
                    .await?;
                result.video_url = Some(url);
            }
            "images" => {
                let file_name = format!("images/{}", Uuid::new_v4());
                let url = state
                    .media
                    .upload(data.to_vec(), &file_name, &content_type)
                    .await?;
                result.image_urls.push(url);
            }
            "attachments" => {
                let file_name = format!("attachments/{}", Uuid::new_v4());
                let url = state
                    .media
                    .upload(data.to_vec(), &file_name, &content_type)
                    .await?;
                result.attachment_urls.push(url);
            }
            _ => {} 
        }
    }

    Ok(Json(result))
}