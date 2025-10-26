use std::time::SystemTime;

use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use reqwest::{Client, StatusCode as ReqwestStatusCode};
use serde_json::json;
use uuid::Uuid;

use crate::{auth::Claims, config::Config, database::Database};

type UploadResponse = Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)>;

pub fn upload_routes() -> Router<Database> {
    Router::new()
        .route("/image", post(upload_image))
        .route("/video", post(upload_video))
}

async fn upload_image(
    State(_db): State<Database>,
    _claims: Claims,
    multipart: Multipart,
) -> UploadResponse {
    handle_upload(multipart, "images", &["image/"], 5 * 1024 * 1024).await
}

async fn upload_video(
    State(_db): State<Database>,
    _claims: Claims,
    multipart: Multipart,
) -> UploadResponse {
    handle_upload(multipart, "videos", &["video/"], 300 * 1024 * 1024).await
}

async fn handle_upload(
    mut multipart: Multipart,
    folder: &str,
    allowed_mime_prefixes: &[&str],
    max_size_bytes: usize,
) -> UploadResponse {
    let mut bytes: Vec<u8> = Vec::new();
    let mut file_name: Option<String> = None;
    let mut content_type: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| json_error(StatusCode::BAD_REQUEST, "Invalid multipart payload"))?
    {
        let field_content_type = field
            .content_type()
            .map(|mime| mime.to_string())
            .unwrap_or_default();

        if !allowed_mime_prefixes
            .iter()
            .any(|prefix| field_content_type.starts_with(prefix))
        {
            return Err(json_error(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "Unsupported file type",
            ));
        }

        let extension = guess_extension(&field_content_type, field.file_name());
        let file_id = Uuid::new_v4();
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|duration| duration.as_secs())
            .unwrap_or_default();
        let generated_name = format!("{}_{}.{}", timestamp, file_id, extension);

        file_name = Some(generated_name);
        content_type = Some(field_content_type);

        let mut field = field;
        let mut total_bytes: usize = 0;

        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|_| json_error(StatusCode::BAD_REQUEST, "Could not read upload stream"))?
        {
            total_bytes += chunk.len();
            if total_bytes > max_size_bytes {
                return Err(json_error(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "Uploaded file exceeds size limit",
                ));
            }
            bytes.extend_from_slice(&chunk);
        }

        if total_bytes == 0 {
            return Err(json_error(StatusCode::BAD_REQUEST, "Empty file upload"));
        }
    }

    let file_name = file_name
        .ok_or_else(|| json_error(StatusCode::BAD_REQUEST, "No file found in upload payload"))?;
    let content_type = content_type.unwrap_or_else(|| "application/octet-stream".to_string());

    let config = Config::from_env().map_err(|_| {
        json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to load configuration",
        )
    })?;

    if config.supabase_url.is_empty() || config.supabase_service_role_key.is_empty() {
        return Err(json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Supabase credentials are not configured",
        ));
    }

    let storage_path = format!("{}/{}", folder, file_name);
    let storage_endpoint = format!(
        "{}/storage/v1/object/{}/{}",
        config.supabase_url.trim_end_matches('/'),
        config.supabase_bucket,
        storage_path
    );

    let client = Client::new();
    let response = client
        .post(&storage_endpoint)
        .header(
            "Authorization",
            format!("Bearer {}", config.supabase_service_role_key),
        )
        .header("Content-Type", &content_type)
        .header("Content-Length", bytes.len())
        .header("X-Upsert", "true")
        .body(bytes)
        .send()
        .await
        .map_err(|error| {
            tracing::error!("Supabase upload failed: {}", error);
            json_error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to upload media")
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!(
            "Supabase upload error (status {}): {}",
            status.as_u16(),
            error_text
        );

        let http_status = if status == ReqwestStatusCode::UNAUTHORIZED {
            StatusCode::UNAUTHORIZED
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        };

        return Err(json_error(http_status, "Failed to upload media"));
    }

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        config.supabase_url.trim_end_matches('/'),
        config.supabase_bucket,
        storage_path
    );

    Ok(Json(json!({
        "success": true,
        "data": {
            "url": public_url,
            "contentType": content_type,
        }
    })))
}

fn json_error(status: StatusCode, message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        status,
        Json(json!({
            "success": false,
            "message": message,
        })),
    )
}

fn guess_extension(content_type: &str, original_name: Option<&str>) -> String {
    if let Some(name) = original_name {
        if let Some(ext) = std::path::Path::new(name)
            .extension()
            .and_then(|ext| ext.to_str())
        {
            return ext.to_ascii_lowercase();
        }
    }

    match content_type {
        "image/jpeg" => "jpg".to_string(),
        "image/png" => "png".to_string(),
        "image/gif" => "gif".to_string(),
        "image/webp" => "webp".to_string(),
        "video/mp4" => "mp4".to_string(),
        "video/quicktime" => "mov".to_string(),
        "video/webm" => "webm".to_string(),
        _ => "bin".to_string(),
    }
}
