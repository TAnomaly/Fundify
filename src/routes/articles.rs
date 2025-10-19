use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::error::AppError;
use crate::middleware::auth::{AuthUser, OptionalAuthUser};
use crate::models::article::{
    ArticleCategory, ArticleComment, ArticleCommentsResponse, ArticleDetail, ArticleLikeResponse,
    ArticleListResponse, ArticleTag,
};
use crate::services::article_service::{
    add_article_comment, create_article, delete_article, delete_article_comment,
    get_article_by_slug, list_article_comments, list_articles, list_categories, list_tags,
    toggle_article_like, update_article, ArticleCommentInput, ArticleCreateInput,
    ArticleListFilters, ArticleUpdateInput,
};
use crate::state::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new()
        .route(
            "/articles",
            get(handle_list_articles).post(handle_create_article),
        )
        .route(
            "/articles/:slug",
            get(handle_get_article).put(handle_update_article),
        )
        .route("/articles/id/:id", delete(handle_delete_article))
        .route("/articles/:id/like", post(handle_toggle_like))
        .route(
            "/articles/:id/comments",
            get(handle_get_comments).post(handle_add_comment),
        )
        .route(
            "/articles/:id/comments/:comment_id",
            delete(handle_delete_comment),
        )
        .route("/articles/categories", get(handle_list_categories))
        .route("/articles/tags", get(handle_list_tags))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArticleListQuery {
    status: Option<String>,
    category_slug: Option<String>,
    tag_slug: Option<String>,
    author_id: Option<Uuid>,
    search: Option<String>,
    is_premium: Option<bool>,
    page: Option<u32>,
    limit: Option<u32>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct ArticleBaseRequest {
    #[validate(length(min = 3, max = 180))]
    title: String,
    #[serde(default)]
    #[validate(length(max = 500))]
    excerpt: Option<String>,
    #[validate(length(min = 20))]
    content: String,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    #[validate(length(max = 180))]
    meta_title: Option<String>,
    #[serde(default)]
    #[validate(length(max = 500))]
    meta_description: Option<String>,
    #[serde(default)]
    keywords: Option<Vec<String>>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    published_at: Option<DateTime<Utc>>,
    #[serde(default)]
    scheduled_for: Option<DateTime<Utc>>,
    #[serde(default)]
    read_time: Option<i32>,
    #[serde(default = "default_true")]
    is_public: bool,
    #[serde(default)]
    is_premium: bool,
    #[serde(default)]
    minimum_tier_id: Option<Uuid>,
    #[serde(default)]
    category_ids: Vec<Uuid>,
    #[serde(default)]
    tag_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct UpdateArticleRequest {
    #[serde(default)]
    #[validate(length(min = 3, max = 180))]
    title: Option<String>,
    #[serde(default)]
    #[validate(length(max = 500))]
    excerpt: Option<String>,
    #[serde(default)]
    #[validate(length(min = 20))]
    content: Option<String>,
    #[serde(default)]
    #[validate(url)]
    cover_image: Option<String>,
    #[serde(default)]
    #[validate(length(max = 180))]
    meta_title: Option<String>,
    #[serde(default)]
    #[validate(length(max = 500))]
    meta_description: Option<String>,
    #[serde(default)]
    keywords: Option<Vec<String>>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    published_at: Option<DateTime<Utc>>,
    #[serde(default)]
    scheduled_for: Option<DateTime<Utc>>,
    #[serde(default)]
    read_time: Option<i32>,
    #[serde(default)]
    is_public: Option<bool>,
    #[serde(default)]
    is_premium: Option<bool>,
    #[serde(default)]
    minimum_tier_id: Option<Uuid>,
    #[serde(default)]
    category_ids: Option<Vec<Uuid>>,
    #[serde(default)]
    tag_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct CommentRequest {
    #[validate(length(min = 1, max = 500))]
    content: String,
}

fn default_true() -> bool {
    true
}

async fn handle_list_articles(
    State(state): State<SharedState>,
    OptionalAuthUser(viewer): OptionalAuthUser,
    Query(query): Query<ArticleListQuery>,
) -> Result<Json<ArticleListResponse>, AppError> {
    let filters = ArticleListFilters {
        status: query.status.map(|s| s.trim().to_ascii_uppercase()),
        category_slug: query.category_slug.map(|s| s.trim().to_string()),
        tag_slug: query.tag_slug.map(|s| s.trim().to_string()),
        author_id: query.author_id,
        search: query.search.map(|s| s.trim().to_string()),
        is_premium: query.is_premium,
        page: query.page.unwrap_or(1),
        limit: query.limit.unwrap_or(10),
    };

    let viewer_id = viewer.map(|auth| auth.id);
    let response = list_articles(&state, filters, viewer_id).await?;
    Ok(Json(response))
}

async fn handle_get_article(
    State(state): State<SharedState>,
    OptionalAuthUser(viewer): OptionalAuthUser,
    Path(slug): Path<String>,
) -> Result<Json<ArticleDetail>, AppError> {
    let viewer_id = viewer.map(|auth| auth.id);
    let article = get_article_by_slug(&state, &slug, viewer_id).await?;
    Ok(Json(article))
}

async fn handle_create_article(
    State(state): State<SharedState>,
    AuthUser { id: author_id, .. }: AuthUser,
    Json(body): Json<ArticleBaseRequest>,
) -> Result<Json<ArticleDetail>, AppError> {
    body.validate()?;

    let input = ArticleCreateInput {
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        cover_image: body.cover_image,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        keywords: body.keywords.unwrap_or_default(),
        status: body.status.map(|s| s.to_ascii_uppercase()),
        published_at: body.published_at,
        scheduled_for: body.scheduled_for,
        read_time: body.read_time,
        is_public: body.is_public,
        is_premium: body.is_premium,
        minimum_tier_id: body.minimum_tier_id,
        category_ids: body.category_ids,
        tag_ids: body.tag_ids,
    };

    let article = create_article(&state, author_id, input).await?;
    Ok(Json(article))
}

async fn handle_update_article(
    State(state): State<SharedState>,
    AuthUser { id: author_id, .. }: AuthUser,
    Path(slug): Path<String>,
    Json(body): Json<UpdateArticleRequest>,
) -> Result<Json<ArticleDetail>, AppError> {
    body.validate()?;

    let article_id = find_article_id(&state, &slug, author_id).await?;

    let input = ArticleUpdateInput {
        title: body.title.map(|s| s.to_string()),
        excerpt: body.excerpt,
        content: body.content,
        cover_image: body.cover_image,
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        keywords: body.keywords,
        status: body.status.map(|s| s.to_ascii_uppercase()),
        published_at: body.published_at.map(Some),
        scheduled_for: body.scheduled_for.map(Some),
        read_time: body.read_time.map(Some),
        is_public: body.is_public,
        is_premium: body.is_premium,
        minimum_tier_id: body.minimum_tier_id.map(Some),
        category_ids: body.category_ids,
        tag_ids: body.tag_ids,
    };

    let article = update_article(&state, article_id, author_id, input).await?;
    Ok(Json(article))
}

async fn handle_delete_article(
    State(state): State<SharedState>,
    AuthUser { id: author_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<(), AppError> {
    delete_article(&state, id, author_id).await
}

async fn handle_toggle_like(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ArticleLikeResponse>, AppError> {
    let response = toggle_article_like(&state, id, user_id).await?;
    Ok(Json(response))
}

async fn handle_get_comments(
    State(state): State<SharedState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ArticleCommentsResponse>, AppError> {
    let response = list_article_comments(&state, id).await?;
    Ok(Json(response))
}

async fn handle_add_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<CommentRequest>,
) -> Result<Json<ArticleComment>, AppError> {
    body.validate()?;

    let comment = add_article_comment(
        &state,
        id,
        user_id,
        ArticleCommentInput {
            content: body.content,
        },
    )
    .await?;

    Ok(Json(comment))
}

async fn handle_delete_comment(
    State(state): State<SharedState>,
    AuthUser { id: user_id, .. }: AuthUser,
    Path((id, comment_id)): Path<(Uuid, Uuid)>,
) -> Result<(), AppError> {
    delete_article_comment(&state, id, comment_id, user_id).await
}

async fn handle_list_categories(
    State(state): State<SharedState>,
) -> Result<Json<Vec<ArticleCategory>>, AppError> {
    let categories = list_categories(&state).await?;
    Ok(Json(categories))
}

async fn handle_list_tags(
    State(state): State<SharedState>,
) -> Result<Json<Vec<ArticleTag>>, AppError> {
    let tags = list_tags(&state).await?;
    Ok(Json(tags))
}

async fn find_article_id(
    state: &SharedState,
    slug: &str,
    author_id: Uuid,
) -> Result<Uuid, AppError> {
    let id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT id FROM articles WHERE slug = $1 AND author_id = $2",
    )
    .bind(slug)
    .bind(author_id)
    .fetch_one(&state.db_pool)
    .await?;

    id.ok_or(AppError::NotFound("Article not found".to_string()))
}
