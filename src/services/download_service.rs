use crate::error::AppError;
use crate::state::SharedState;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct DownloadCreateRequest {
    pub title: String,
    pub description: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: u64,
    pub is_public: bool,
    pub requires_subscription: bool,
    pub tags: Vec<String>,
    pub creator_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct DownloadUpdateRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub file_url: Option<String>,
    pub file_type: Option<String>,
    pub file_size: Option<u64>,
    pub is_public: Option<bool>,
    pub requires_subscription: Option<bool>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct DownloadResponse {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: u64,
    pub is_public: bool,
    pub requires_subscription: bool,
    pub tags: Vec<String>,
    pub creator_id: Uuid,
    pub download_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub creator: DownloadCreator,
}

#[derive(Debug, Serialize)]
pub struct DownloadCreator {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

pub async fn create_download(
    state: &SharedState,
    input: DownloadCreateRequest,
) -> Result<DownloadResponse, AppError> {
    let download_id = Uuid::new_v4();
    
    let download = sqlx::query!(
        r#"
        INSERT INTO downloads (
            id, title, description, file_url, file_type, file_size,
            is_public, requires_subscription, tags, creator_id, download_count,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NOW(), NOW())
        RETURNING *
        "#,
        download_id,
        input.title,
        input.description,
        input.file_url,
        input.file_type,
        input.file_size as i64,
        input.is_public,
        input.requires_subscription,
        &input.tags,
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    let creator = sqlx::query!(
        "SELECT id, name, username, avatar FROM users WHERE id = $1",
        input.creator_id
    )
    .fetch_one(&state.db_pool)
    .await?;

    Ok(DownloadResponse {
        id: download.id,
        title: download.title,
        description: download.description,
        file_url: download.file_url,
        file_type: download.file_type,
        file_size: download.file_size as u64,
        is_public: download.is_public,
        requires_subscription: download.requires_subscription,
        tags: download.tags,
        creator_id: download.creator_id,
        download_count: download.download_count,
        created_at: download.created_at,
        updated_at: download.updated_at,
        creator: DownloadCreator {
            id: creator.id,
            name: creator.name,
            username: creator.username,
            avatar: creator.avatar,
        },
    })
}

pub async fn get_creator_downloads(
    state: &SharedState,
    creator_id: Uuid,
    page: u32,
    limit: u32,
    file_type: Option<String>,
    is_public: Option<bool>,
) -> Result<Vec<DownloadResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let mut where_clause = "creator_id = $1".to_string();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(file_type_filter) = file_type {
        where_clause.push_str(&format!(" AND file_type = ${}", param_count + 1));
        params.push(Box::new(file_type_filter));
        param_count += 1;
    }

    if let Some(public) = is_public {
        where_clause.push_str(&format!(" AND is_public = ${}", param_count + 1));
        params.push(Box::new(public));
        param_count += 1;
    }

    let query_str = format!(
        r#"
        SELECT 
            d.*,
            u.name as creator_name,
            u.username as creator_username,
            u.avatar as creator_avatar
        FROM downloads d
        JOIN users u ON d.creator_id = u.id
        WHERE {}
        ORDER BY d.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        param_count + 1,
        param_count + 2
    );

    // For now, return empty result (TODO: implement dynamic query)
    Ok(vec![])
}

pub async fn get_download_by_id(
    state: &SharedState,
    download_id: Uuid,
) -> Result<DownloadResponse, AppError> {
    let download = sqlx::query!(
        r#"
        SELECT 
            d.*,
            u.name as creator_name,
            u.username as creator_username,
            u.avatar as creator_avatar
        FROM downloads d
        JOIN users u ON d.creator_id = u.id
        WHERE d.id = $1
        "#,
        download_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let download = match download {
        Some(d) => d,
        None => return Err(AppError::NotFound("Download not found".to_string())),
    };

    Ok(DownloadResponse {
        id: download.id,
        title: download.title,
        description: download.description,
        file_url: download.file_url,
        file_type: download.file_type,
        file_size: download.file_size as u64,
        is_public: download.is_public,
        requires_subscription: download.requires_subscription,
        tags: download.tags,
        creator_id: download.creator_id,
        download_count: download.download_count,
        created_at: download.created_at,
        updated_at: download.updated_at,
        creator: DownloadCreator {
            id: download.creator_id,
            name: download.creator_name,
            username: download.creator_username,
            avatar: download.creator_avatar,
        },
    })
}

pub async fn update_download(
    state: &SharedState,
    user_id: Uuid,
    download_id: Uuid,
    input: DownloadUpdateRequest,
) -> Result<DownloadResponse, AppError> {
    // Check if download exists and user owns it
    let download = sqlx::query!(
        "SELECT creator_id FROM downloads WHERE id = $1",
        download_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let download = match download {
        Some(d) => d,
        None => return Err(AppError::NotFound("Download not found".to_string())),
    };

    if download.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    // Build dynamic update query
    let mut update_fields = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_count = 1;

    if let Some(title) = input.title {
        update_fields.push(format!("title = ${}", param_count));
        params.push(Box::new(title));
        param_count += 1;
    }

    if let Some(description) = input.description {
        update_fields.push(format!("description = ${}", param_count));
        params.push(Box::new(description));
        param_count += 1;
    }

    if let Some(file_url) = input.file_url {
        update_fields.push(format!("file_url = ${}", param_count));
        params.push(Box::new(file_url));
        param_count += 1;
    }

    if let Some(file_type) = input.file_type {
        update_fields.push(format!("file_type = ${}", param_count));
        params.push(Box::new(file_type));
        param_count += 1;
    }

    if let Some(file_size) = input.file_size {
        update_fields.push(format!("file_size = ${}", param_count));
        params.push(Box::new(file_size as i64));
        param_count += 1;
    }

    if let Some(is_public) = input.is_public {
        update_fields.push(format!("is_public = ${}", param_count));
        params.push(Box::new(is_public));
        param_count += 1;
    }

    if let Some(requires_subscription) = input.requires_subscription {
        update_fields.push(format!("requires_subscription = ${}", param_count));
        params.push(Box::new(requires_subscription));
        param_count += 1;
    }

    if let Some(tags) = input.tags {
        update_fields.push(format!("tags = ${}", param_count));
        params.push(Box::new(tags));
        param_count += 1;
    }

    if update_fields.is_empty() {
        return get_download_by_id(state, download_id).await;
    }

    update_fields.push("updated_at = NOW()".to_string());
    update_fields.push(format!("id = ${}", param_count));
    params.push(Box::new(download_id));

    // For now, return the existing download (TODO: implement dynamic query)
    get_download_by_id(state, download_id).await
}

pub async fn delete_download(
    state: &SharedState,
    user_id: Uuid,
    download_id: Uuid,
) -> Result<(), AppError> {
    let download = sqlx::query!(
        "SELECT creator_id FROM downloads WHERE id = $1",
        download_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    let download = match download {
        Some(d) => d,
        None => return Err(AppError::NotFound("Download not found".to_string())),
    };

    if download.creator_id != user_id {
        return Err(AppError::Forbidden("Unauthorized".to_string()));
    }

    sqlx::query!("DELETE FROM downloads WHERE id = $1", download_id)
        .execute(&state.db_pool)
        .await?;

    Ok(())
}

pub async fn record_download(
    state: &SharedState,
    user_id: Uuid,
    download_id: Uuid,
) -> Result<(), AppError> {
    // Check if download exists
    let download = sqlx::query!(
        "SELECT id FROM downloads WHERE id = $1",
        download_id
    )
    .fetch_optional(&state.db_pool)
    .await?;

    if download.is_none() {
        return Err(AppError::NotFound("Download not found".to_string()));
    }

    // Record download
    sqlx::query!(
        r#"
        INSERT INTO download_records (id, user_id, download_id, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, download_id) DO NOTHING
        "#,
        Uuid::new_v4(),
        user_id,
        download_id
    )
    .execute(&state.db_pool)
    .await?;

    // Update download count
    sqlx::query!(
        "UPDATE downloads SET download_count = download_count + 1 WHERE id = $1",
        download_id
    )
    .execute(&state.db_pool)
    .await?;

    Ok(())
}

pub async fn get_user_download_history(
    state: &SharedState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<Vec<DownloadResponse>, AppError> {
    let offset = (page - 1) * limit;
    
    let downloads = sqlx::query!(
        r#"
        SELECT 
            d.*,
            u.name as creator_name,
            u.username as creator_username,
            u.avatar as creator_avatar
        FROM download_records dr
        JOIN downloads d ON dr.download_id = d.id
        JOIN users u ON d.creator_id = u.id
        WHERE dr.user_id = $1
        ORDER BY dr.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(&state.db_pool)
    .await?;

    let mut result = Vec::new();
    for download in downloads {
        result.push(DownloadResponse {
            id: download.id,
            title: download.title,
            description: download.description,
            file_url: download.file_url,
            file_type: download.file_type,
            file_size: download.file_size as u64,
            is_public: download.is_public,
            requires_subscription: download.requires_subscription,
            tags: download.tags,
            creator_id: download.creator_id,
            download_count: download.download_count,
            created_at: download.created_at,
            updated_at: download.updated_at,
            creator: DownloadCreator {
                id: download.creator_id,
                name: download.creator_name,
                username: download.creator_username,
                avatar: download.creator_avatar,
            },
        });
    }

    Ok(result)
}
