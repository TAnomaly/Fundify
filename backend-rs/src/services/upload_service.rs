use crate::error::AppError;
use crate::state::SharedState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub id: Uuid,
    pub filename: String,
    pub original_name: String,
    pub content_type: String,
    pub size: u64,
    pub url: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct UploadMultipleResponse {
    pub uploads: Vec<UploadResponse>,
    pub total_size: u64,
}

pub async fn upload_image(
    state: &SharedState,
    user_id: Uuid,
    filename: String,
    content_type: String,
    data: Vec<u8>,
) -> Result<UploadResponse, AppError> {
    let upload_id = Uuid::new_v4();
    let file_path = format!("uploads/images/{}/{}.jpg", user_id, upload_id);
    
    // TODO: Implement actual file upload to storage (S3, local filesystem, etc.)
    // For now, just store metadata in database
    
    let upload = sqlx::query!(
        r#"
        INSERT INTO uploads (
            id, filename, original_name, content_type, size, 
            file_path, user_id, upload_type, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'IMAGE', NOW())
        RETURNING *
        "#,
        upload_id,
        filename,
        filename,
        content_type,
        data.len() as i64,
        file_path,
        user_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(UploadResponse {
        id: upload.id,
        filename: upload.filename,
        original_name: upload.original_name,
        content_type: upload.content_type,
        size: upload.size as u64,
        url: format!("/uploads/{}", upload.file_path),
        created_at: upload.created_at,
    })
}

pub async fn upload_video(
    state: &SharedState,
    user_id: Uuid,
    filename: String,
    content_type: String,
    data: Vec<u8>,
) -> Result<UploadResponse, AppError> {
    let upload_id = Uuid::new_v4();
    let file_path = format!("uploads/videos/{}/{}.mp4", user_id, upload_id);
    
    let upload = sqlx::query!(
        r#"
        INSERT INTO uploads (
            id, filename, original_name, content_type, size, 
            file_path, user_id, upload_type, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'VIDEO', NOW())
        RETURNING *
        "#,
        upload_id,
        filename,
        filename,
        content_type,
        data.len() as i64,
        file_path,
        user_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(UploadResponse {
        id: upload.id,
        filename: upload.filename,
        original_name: upload.original_name,
        content_type: upload.content_type,
        size: upload.size as u64,
        url: format!("/uploads/{}", upload.file_path),
        created_at: upload.created_at,
    })
}

pub async fn upload_multiple_images(
    state: &SharedState,
    user_id: Uuid,
    images: Vec<(String, String, Vec<u8>)>,
) -> Result<UploadMultipleResponse, AppError> {
    let mut uploads = Vec::new();
    let mut total_size = 0u64;

    for (filename, content_type, data) in images {
        let upload_id = Uuid::new_v4();
        let file_path = format!("uploads/images/{}/{}.jpg", user_id, upload_id);
        
        let upload = sqlx::query!(
            r#"
            INSERT INTO uploads (
                id, filename, original_name, content_type, size, 
                file_path, user_id, upload_type, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'IMAGE', NOW())
            RETURNING *
            "#,
            upload_id,
            filename.clone(),
            filename,
            content_type,
            data.len() as i64,
            file_path,
            user_id
        )
        .fetch_one(&state.db_pool)
        .await?;

        total_size += upload.size as u64;
        uploads.push(UploadResponse {
            id: upload.id,
            filename: upload.filename,
            original_name: upload.original_name,
            content_type: upload.content_type,
            size: upload.size as u64,
            url: format!("/uploads/{}", upload.file_path),
            created_at: upload.created_at,
        });
    }

    Ok(UploadMultipleResponse {
        uploads,
        total_size,
    })
}

pub async fn upload_post_media(
    state: &SharedState,
    user_id: Uuid,
    images: Vec<(String, String, Vec<u8>)>,
    videos: Vec<(String, String, Vec<u8>)>,
    attachments: Vec<(String, String, Vec<u8>)>,
) -> Result<UploadMultipleResponse, AppError> {
    let mut uploads = Vec::new();
    let mut total_size = 0u64;

    // Upload images
    for (filename, content_type, data) in images {
        let upload_id = Uuid::new_v4();
        let file_path = format!("uploads/images/{}/{}.jpg", user_id, upload_id);
        
        let upload = sqlx::query!(
            r#"
            INSERT INTO uploads (
                id, filename, original_name, content_type, size, 
                file_path, user_id, upload_type, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'IMAGE', NOW())
            RETURNING *
            "#,
            upload_id,
            filename.clone(),
            filename,
            content_type,
            data.len() as i64,
            file_path,
            user_id
        )
        .fetch_one(&state.db_pool)
        .await?;

        total_size += upload.size as u64;
        uploads.push(UploadResponse {
            id: upload.id,
            filename: upload.filename,
            original_name: upload.original_name,
            content_type: upload.content_type,
            size: upload.size as u64,
            url: format!("/uploads/{}", upload.file_path),
            created_at: upload.created_at,
        });
    }

    // Upload videos
    for (filename, content_type, data) in videos {
        let upload_id = Uuid::new_v4();
        let file_path = format!("uploads/videos/{}/{}.mp4", user_id, upload_id);
        
        let upload = sqlx::query!(
            r#"
            INSERT INTO uploads (
                id, filename, original_name, content_type, size, 
                file_path, user_id, upload_type, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'VIDEO', NOW())
            RETURNING *
            "#,
            upload_id,
            filename.clone(),
            filename,
            content_type,
            data.len() as i64,
            file_path,
            user_id
        )
        .fetch_one(&state.db_pool)
        .await?;

        total_size += upload.size as u64;
        uploads.push(UploadResponse {
            id: upload.id,
            filename: upload.filename,
            original_name: upload.original_name,
            content_type: upload.content_type,
            size: upload.size as u64,
            url: format!("/uploads/{}", upload.file_path),
            created_at: upload.created_at,
        });
    }

    // Upload attachments
    for (filename, content_type, data) in attachments {
        let upload_id = Uuid::new_v4();
        let file_path = format!("uploads/attachments/{}/{}", user_id, upload_id);
        
        let upload = sqlx::query!(
            r#"
            INSERT INTO uploads (
                id, filename, original_name, content_type, size, 
                file_path, user_id, upload_type, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ATTACHMENT', NOW())
            RETURNING *
            "#,
            upload_id,
            filename.clone(),
            filename,
            content_type,
            data.len() as i64,
            file_path,
            user_id
        )
        .fetch_one(&state.db_pool)
        .await?;

        total_size += upload.size as u64;
        uploads.push(UploadResponse {
            id: upload.id,
            filename: upload.filename,
            original_name: upload.original_name,
            content_type: upload.content_type,
            size: upload.size as u64,
            url: format!("/uploads/{}", upload.file_path),
            created_at: upload.created_at,
        });
    }

    Ok(UploadMultipleResponse {
        uploads,
        total_size,
    })
}
