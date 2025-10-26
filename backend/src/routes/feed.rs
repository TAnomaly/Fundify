use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post},
    Router,
};
use serde::Deserialize;

use crate::{auth::Claims, database::Database};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedQuery {
    pub cursor: Option<String>,
    pub limit: Option<u32>,
    #[serde(rename = "type")]
    pub filter: Option<String>,
    pub sort: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkPayload {
    pub content_type: Option<String>,
    pub content_id: Option<String>,
}

pub fn feed_routes() -> Router<Database> {
    Router::new().route("/", get(get_feed)).route(
        "/bookmarks",
        get(get_bookmarks)
            .post(add_bookmark)
            .delete(remove_bookmark),
    )
}

async fn get_feed(
    _state: State<Database>,
    _claims: Claims,
    Query(params): Query<FeedQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let filter = params.filter.unwrap_or_else(|| "all".to_string());
    let sort = params.sort.unwrap_or_else(|| "recent".to_string());
    let period_str = params.period.unwrap_or_else(|| "72h".to_string());
    let period_value = period_str
        .trim_end_matches(|c: char| !c.is_ascii_digit())
        .parse::<u32>()
        .unwrap_or(72);

    let response = serde_json::json!({
        "success": true,
        "data": {
            "items": [],
            "highlights": [],
            "recommendedContent": [],
            "recommendedCreators": [],
            "filters": {
                "filter": filter,
                "sort": sort,
                "period": period_value
            },
            "summary": {
                "totalItems": 0,
                "highlightCount": 0,
                "recommendationsCount": 0
            },
            "nextCursor": null,
            "hasMore": false
        }
    });

    Ok(Json(response))
}

async fn get_bookmarks(
    _state: State<Database>,
    _claims: Claims,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "success": true,
        "data": []
    });

    Ok(Json(response))
}

async fn add_bookmark(
    _state: State<Database>,
    _claims: Claims,
    Json(_payload): Json<BookmarkPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "success": true
    });

    Ok(Json(response))
}

async fn remove_bookmark(
    _state: State<Database>,
    _claims: Claims,
    Json(_payload): Json<BookmarkPayload>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let response = serde_json::json!({
        "success": true
    });

    Ok(Json(response))
}
