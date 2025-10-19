use axum::{
    extract::{Query, State},
    response::{IntoResponse, Json},
    routing::{delete, get},
    Router,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::feed_service::{
    add_bookmark, get_feed, list_bookmarks, remove_bookmark, FeedFilters, FeedResponse,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route("/feed", get(handle_get_feed))
        .route("/feed/bookmarks", get(handle_list_bookmarks).post(handle_add_bookmark))
        .route("/feed/bookmarks", delete(handle_remove_bookmark))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeedQuery {
    limit: Option<u32>,
    cursor: Option<String>,
    r#type: Option<String>,
    sort: Option<String>,
    period: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BookmarkRequest {
    content_type: String,
    content_id: Uuid,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoveBookmarkRequest {
    content_type: String,
    content_id: Uuid,
}

async fn handle_get_feed(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Query(query): Query<FeedQuery>,
) -> Result<Json<FeedResponse>, AppError> {
    let filters = FeedFilters {
        limit: query.limit.unwrap_or(20),
        cursor: query.cursor,
        r#type: query.r#type,
        sort: query.sort,
        period: query.period,
    };

    let feed = get_feed(&state, user_id, filters).await?;
    Ok(Json(feed))
}

async fn handle_list_bookmarks(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, AppError> {
    let bookmarks = list_bookmarks(&state, user_id).await?;
    Ok(Json(bookmarks))
}

async fn handle_add_bookmark(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<BookmarkRequest>,
) -> Result<impl IntoResponse, AppError> {
    add_bookmark(&state, user_id, body.content_type, body.content_id).await?;
    Ok(axum::http::StatusCode::CREATED)
}

async fn handle_remove_bookmark(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Json(body): Json<RemoveBookmarkRequest>,
) -> Result<impl IntoResponse, AppError> {
    remove_bookmark(&state, user_id, body.content_type, body.content_id).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}
