use std::{path::PathBuf, time::SystemTime};

use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde_json::json;
use tokio::{fs, io::AsyncWriteExt};
use uuid::Uuid;

use crate::{auth::Claims, database::Database};

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
    handle_upload(
        multipart,
        "images",
        &["image/"],
        5 * 1024 * 1024, // 5MB
    )
    .await
}

async fn upload_video(
    State(_db): State<Database>,
    _claims: Claims,
    multipart: Multipart,
) -> UploadResponse {
    handle_upload(
        multipart,
        "videos",
        &["video/"],
        500 * 1024 * 1024, // 500MB
    )
    .await
}

async fn handle_upload(
    mut multipart: Multipart,
    folder: &str,
    allowed_mime_prefixes: &[&str],
    max_size_bytes: usize,
) -> UploadResponse {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| json_error(StatusCode::BAD_REQUEST, "Invalid multipart payload"))?
    {
        let content_type = field
            .content_type()
            .map(|mime| mime.to_string())
            .unwrap_or_default();

        if !allowed_mime_prefixes
            .iter()
            .any(|prefix| content_type.starts_with(prefix))
        {
            return Err(json_error(
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "Unsupported file type",
            ));
        }

        let extension = guess_extension(&content_type, field.file_name());
        let file_id = Uuid::new_v4();
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|duration| duration.as_secs())
            .unwrap_or_default();
        let file_name = format!("{}_{}.{}", timestamp, file_id, extension);

        let upload_root =
            PathBuf::from(std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string()));
        let target_dir = upload_root.join(folder);
        fs::create_dir_all(&target_dir).await.map_err(|_| {
            json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to prepare storage",
            )
        })?;

        let file_path = target_dir.join(&file_name);
        let mut file = fs::File::create(&file_path)
            .await
            .map_err(|_| json_error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to create file"))?;

        let mut total_bytes: usize = 0;
        let mut field = field;
        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|_| json_error(StatusCode::BAD_REQUEST, "Could not read upload stream"))?
        {
            total_bytes += chunk.len();
            if total_bytes > max_size_bytes {
                drop(file);
                let _ = fs::remove_file(&file_path).await;
                return Err(json_error(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "Uploaded file exceeds size limit",
                ));
            }
            file.write_all(&chunk).await.map_err(|_| {
                json_error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to save file")
            })?;
        }

        if total_bytes == 0 {
            let _ = fs::remove_file(&file_path).await;
            return Err(json_error(StatusCode::BAD_REQUEST, "Empty file upload"));
        }

        let relative_url = format!("/uploads/{}/{}", folder, file_name);
        return Ok(Json(json!({
            "success": true,
            "data": {
                "url": relative_url,
                "contentType": content_type,
                "size": total_bytes,
            }
        })));
    }

    Err(json_error(
        StatusCode::BAD_REQUEST,
        "No file found in upload payload",
    ))
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
