use std::collections::HashMap;

use crate::error::AppError;
use crate::models::article::{
    ArticleCategory, ArticleComment, ArticleCommentRow, ArticleCommentsResponse, ArticleDetail,
    ArticleDetailRow, ArticleLikeResponse, ArticleListResponse, ArticlePagination,
    ArticleSummaryRow, ArticleTag,
};
use crate::state::AppState;
use crate::utils::slug::slugify;
use chrono::{DateTime, Utc};
use sqlx::{postgres::PgRow, QueryBuilder, Row};
use uuid::Uuid;

const MAX_PAGE_LIMIT: u32 = 50;

#[derive(Debug, Clone)]
pub struct ArticleListFilters {
    pub status: Option<String>,
    pub category_slug: Option<String>,
    pub tag_slug: Option<String>,
    pub author_id: Option<Uuid>,
    pub search: Option<String>,
    pub is_premium: Option<bool>,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone)]
pub struct ArticleCreateInput {
    pub title: String,
    pub excerpt: Option<String>,
    pub content: String,
    pub cover_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub keywords: Vec<String>,
    pub status: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub read_time: Option<i32>,
    pub is_public: bool,
    pub is_premium: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub category_ids: Vec<Uuid>,
    pub tag_ids: Vec<Uuid>,
}

#[derive(Debug, Clone)]
pub struct ArticleUpdateInput {
    pub title: Option<String>,
    pub excerpt: Option<String>,
    pub content: Option<String>,
    pub cover_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub status: Option<String>,
    pub published_at: Option<Option<DateTime<Utc>>>,
    pub scheduled_for: Option<Option<DateTime<Utc>>>,
    pub read_time: Option<Option<i32>>,
    pub is_public: Option<bool>,
    pub is_premium: Option<bool>,
    pub minimum_tier_id: Option<Option<Uuid>>,
    pub category_ids: Option<Vec<Uuid>>,
    pub tag_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Clone)]
pub struct ArticleCommentInput {
    pub content: String,
}

pub async fn list_articles(
    state: &AppState,
    filters: ArticleListFilters,
    viewer: Option<Uuid>,
) -> Result<ArticleListResponse, AppError> {
    let page = filters.page.max(1);
    let limit = filters.limit.clamp(1, MAX_PAGE_LIMIT);
    let offset = ((page - 1) as i64) * (limit as i64);

    let mut query = QueryBuilder::new(
        r#"
        SELECT
            a.id,
            a.slug,
            a.title,
            a.excerpt,
            a.cover_image,
            a.status::text AS status,
            a.is_public,
            a.is_premium,
            a.published_at,
            a.read_time,
            a.view_count,
            a.created_at,
            a.updated_at,
            u.id        AS author_id,
            u.name      AS author_name,
            u.username  AS author_username,
            u.avatar    AS author_avatar,
            COALESCE(l.likes_count, 0)    AS likes_count,
            COALESCE(c.comments_count, 0) AS comments_count,
            NULL::bool                     AS viewer_liked
        FROM articles a
        JOIN users u ON u.id = a.author_id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS likes_count
            FROM article_likes al
            WHERE al.article_id = a.id
        ) l ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS comments_count
            FROM article_comments ac
            WHERE ac.article_id = a.id
        ) c ON TRUE
        WHERE 1 = 1
        "#,
    );

    apply_article_filters(&mut query, &filters, true);

    query
        .push(" ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.created_at DESC ")
        .push(" LIMIT ")
        .push_bind(limit as i64)
        .push(" OFFSET ")
        .push_bind(offset);

    let rows = query
        .build_query_as::<ArticleSummaryRow>()
        .fetch_all(&state.db_pool)
        .await?;

    let ids: Vec<Uuid> = rows.iter().map(|row| row.id).collect();

    let categories_map = load_article_categories(&state.db_pool, &ids).await?;
    let tags_map = load_article_tags(&state.db_pool, &ids).await?;
    let liked_map = if let Some(viewer_id) = viewer {
        load_viewer_likes(&state.db_pool, &ids, viewer_id).await?
    } else {
        HashMap::new()
    };

    let articles = rows
        .into_iter()
        .map(|mut row| {
            if let Some(liked) = liked_map.get(&row.id) {
                row.viewer_liked = Some(*liked);
            }
            let categories = categories_map.get(&row.id).cloned().unwrap_or_default();
            let tags = tags_map.get(&row.id).cloned().unwrap_or_default();
            row.into_summary(categories, tags)
        })
        .collect();

    let mut count_query =
        QueryBuilder::new("SELECT COUNT(*)::bigint AS total FROM articles a WHERE 1 = 1");
    apply_article_filters(&mut count_query, &filters, true);
    let total = count_query
        .build()
        .fetch_one(&state.db_pool)
        .await?
        .get::<i64, _>("total");

    let pages = if total == 0 {
        0
    } else {
        ((total + (limit as i64) - 1) / (limit as i64)) as u32
    };

    Ok(ArticleListResponse {
        articles,
        pagination: ArticlePagination {
            page,
            limit,
            total,
            pages,
        },
    })
}

pub async fn get_article_by_slug(
    state: &AppState,
    slug: &str,
    viewer: Option<Uuid>,
) -> Result<ArticleDetail, AppError> {
    let mut tx = state.db_pool.begin().await?;

    let row = sqlx::query_as::<_, ArticleDetailRow>(
        r#"
        SELECT
            a.id,
            a.slug,
            a.title,
            a.excerpt,
            a.content,
            a.cover_image,
            a.meta_title,
            a.meta_description,
            a.keywords,
            a.status::text AS status,
            a.published_at,
            a.scheduled_for,
            a.read_time,
            a.view_count,
            a.is_public,
            a.is_premium,
            a.minimum_tier_id,
            a.created_at,
            a.updated_at,
            u.id        AS author_id,
            u.name      AS author_name,
            u.username  AS author_username,
            u.avatar    AS author_avatar,
            COALESCE(l.likes_count, 0)    AS likes_count,
            COALESCE(c.comments_count, 0) AS comments_count,
            NULL::bool                     AS viewer_liked
        FROM articles a
        JOIN users u ON u.id = a.author_id
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS likes_count
            FROM article_likes al
            WHERE al.article_id = a.id
        ) l ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*)::bigint AS comments_count
            FROM article_comments ac
            WHERE ac.article_id = a.id
        ) c ON TRUE
        WHERE a.slug = $1
        LIMIT 1
        "#,
    )
    .bind(slug)
    .fetch_optional(&mut *tx)
    .await?;

    let mut row = row.ok_or(AppError::NotFound("Article not found".to_string()))?;

    sqlx::query("UPDATE articles SET view_count = view_count + 1 WHERE id = $1")
        .bind(row.id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    let categories_map = load_article_categories(&state.db_pool, &[row.id]).await?;
    let tags_map = load_article_tags(&state.db_pool, &[row.id]).await?;

    if let Some(viewer_id) = viewer {
        let liked = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (SELECT 1 FROM article_likes WHERE article_id = $1 AND user_id = $2)",
        )
        .bind(row.id)
        .bind(viewer_id)
        .fetch_one(&state.db_pool)
        .await?;
        row.viewer_liked = Some(liked);
    }

    let categories = categories_map.get(&row.id).cloned().unwrap_or_default();
    let tags = tags_map.get(&row.id).cloned().unwrap_or_default();

    Ok(row.into_detail(categories, tags))
}

pub async fn create_article(
    state: &AppState,
    author_id: Uuid,
    input: ArticleCreateInput,
) -> Result<ArticleDetail, AppError> {
    let mut tx = state.db_pool.begin().await?;

    validate_categories(&mut tx, &input.category_ids).await?;
    validate_tags(&mut tx, &input.tag_ids).await?;

    let mut slug_base = slugify(&input.title);
    if slug_base.is_empty() {
        slug_base = Uuid::new_v4().to_string();
    }
    let slug = generate_unique_article_slug(&mut tx, &slug_base).await?;

    let status = input.status.unwrap_or_else(|| "DRAFT".to_string());
    let published_at = match status.as_str() {
        "PUBLISHED" => Some(input.published_at.unwrap_or_else(|| Utc::now())),
        _ => input.published_at,
    };

    let article_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO articles (
            id,
            slug,
            title,
            excerpt,
            content,
            cover_image,
            meta_title,
            meta_description,
            keywords,
            status,
            published_at,
            scheduled_for,
            read_time,
            is_public,
            is_premium,
            minimum_tier_id,
            author_id
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10::article_status,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17
        )
        "#,
    )
    .bind(article_id)
    .bind(&slug)
    .bind(&input.title)
    .bind(&input.excerpt)
    .bind(&input.content)
    .bind(&input.cover_image)
    .bind(&input.meta_title)
    .bind(&input.meta_description)
    .bind(&input.keywords)
    .bind(&status)
    .bind(&published_at)
    .bind(&input.scheduled_for)
    .bind(&input.read_time)
    .bind(input.is_public)
    .bind(input.is_premium)
    .bind(input.minimum_tier_id)
    .bind(author_id)
    .execute(&mut *tx)
    .await?;

    set_article_categories(&mut tx, article_id, &input.category_ids).await?;
    set_article_tags(&mut tx, article_id, &input.tag_ids).await?;

    tx.commit().await?;

    get_article_by_slug(state, &slug, Some(author_id)).await
}

pub async fn update_article(
    state: &AppState,
    article_id: Uuid,
    author_id: Uuid,
    mut input: ArticleUpdateInput,
) -> Result<ArticleDetail, AppError> {
    let mut tx = state.db_pool.begin().await?;

    let mut builder = QueryBuilder::new("UPDATE articles SET ");
    let mut separated = builder.separated(", ");
    let mut has_changes = false;

    if let Some(title) = input.title.take() {
        separated.push("title = ").push_bind(title);
        has_changes = true;
    }
    if let Some(excerpt) = input.excerpt.take() {
        separated.push("excerpt = ").push_bind(excerpt);
        has_changes = true;
    }
    if let Some(content) = input.content.take() {
        separated.push("content = ").push_bind(content);
        has_changes = true;
    }
    if let Some(cover_image) = input.cover_image.take() {
        separated.push("cover_image = ").push_bind(cover_image);
        has_changes = true;
    }
    if let Some(meta_title) = input.meta_title.take() {
        separated.push("meta_title = ").push_bind(meta_title);
        has_changes = true;
    }
    if let Some(meta_description) = input.meta_description.take() {
        separated
            .push("meta_description = ")
            .push_bind(meta_description);
        has_changes = true;
    }
    if let Some(keywords) = input.keywords.take() {
        separated.push("keywords = ").push_bind(keywords);
        has_changes = true;
    }
    if let Some(status) = input.status.take() {
        separated
            .push("status = ")
            .push_bind(status)
            .push("::article_status");
        has_changes = true;
    }
    if let Some(published_at) = input.published_at.take() {
        separated.push("published_at = ").push_bind(published_at);
        has_changes = true;
    }
    if let Some(scheduled_for) = input.scheduled_for.take() {
        separated.push("scheduled_for = ").push_bind(scheduled_for);
        has_changes = true;
    }
    if let Some(read_time) = input.read_time.take() {
        separated.push("read_time = ").push_bind(read_time);
        has_changes = true;
    }
    if let Some(is_public) = input.is_public {
        separated.push("is_public = ").push_bind(is_public);
        has_changes = true;
    }
    if let Some(is_premium) = input.is_premium {
        separated.push("is_premium = ").push_bind(is_premium);
        has_changes = true;
    }
    if let Some(minimum_tier_id) = input.minimum_tier_id.take() {
        separated
            .push("minimum_tier_id = ")
            .push_bind(minimum_tier_id);
        has_changes = true;
    }

    if has_changes {
        separated.push("updated_at = NOW()");

        builder.push(" WHERE id = ").push_bind(article_id);
        builder.push(" AND author_id = ").push_bind(author_id);

        let result = builder.build().execute(&mut *tx).await?;
        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Article not found".to_string()));
        }
    }

    if let Some(categories) = input.category_ids.as_ref() {
        validate_categories(&mut tx, categories).await?;
        set_article_categories(&mut tx, article_id, categories).await?;
    }

    if let Some(tags) = input.tag_ids.as_ref() {
        validate_tags(&mut tx, tags).await?;
        set_article_tags(&mut tx, article_id, tags).await?;
    }

    tx.commit().await?;

    let slug = sqlx::query_scalar::<_, String>("SELECT slug FROM articles WHERE id = $1")
        .bind(article_id)
        .fetch_one(&state.db_pool)
        .await?;

    get_article_by_slug(state, &slug, Some(author_id)).await
}

pub async fn delete_article(
    state: &AppState,
    article_id: Uuid,
    author_id: Uuid,
) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM articles WHERE id = $1 AND author_id = $2")
        .bind(article_id)
        .bind(author_id)
        .execute(&state.db_pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Article not found".to_string()));
    }

    Ok(())
}

pub async fn toggle_article_like(
    state: &AppState,
    article_id: Uuid,
    user_id: Uuid,
) -> Result<ArticleLikeResponse, AppError> {
    let inserted = sqlx::query(
        r#"
        INSERT INTO article_likes (article_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (article_id, user_id)
        DO NOTHING
        "#,
    )
    .bind(article_id)
    .bind(user_id)
    .execute(&state.db_pool)
    .await?;

    let liked = if inserted.rows_affected() == 0 {
        // already liked – remove
        sqlx::query("DELETE FROM article_likes WHERE article_id = $1 AND user_id = $2")
            .bind(article_id)
            .bind(user_id)
            .execute(&state.db_pool)
            .await?;
        false
    } else {
        true
    };

    let likes_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::bigint FROM article_likes WHERE article_id = $1",
    )
    .bind(article_id)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(ArticleLikeResponse { liked, likes_count })
}

pub async fn list_article_comments(
    state: &AppState,
    article_id: Uuid,
) -> Result<ArticleCommentsResponse, AppError> {
    let comments = sqlx::query_as::<_, ArticleCommentRow>(
        r#"
        SELECT
            c.id,
            c.article_id,
            c.user_id,
            c.content,
            c.created_at,
            c.updated_at,
            u.id        AS author_id,
            u.name      AS author_name,
            u.username  AS author_username,
            u.avatar    AS author_avatar
        FROM article_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.article_id = $1
        ORDER BY c.created_at DESC
        "#,
    )
    .bind(article_id)
    .fetch_all(&state.db_pool)
    .await?
    .into_iter()
    .map(ArticleComment::from)
    .collect();

    Ok(ArticleCommentsResponse { comments })
}

pub async fn add_article_comment(
    state: &AppState,
    article_id: Uuid,
    user_id: Uuid,
    input: ArticleCommentInput,
) -> Result<ArticleComment, AppError> {
    if input.content.trim().is_empty() {
        return Err(AppError::Validation(vec![
            "Comment content cannot be empty".to_string(),
        ]));
    }

    let comment_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO article_comments (id, article_id, user_id, content)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(comment_id)
    .bind(article_id)
    .bind(user_id)
    .bind(input.content.trim())
    .execute(&state.db_pool)
    .await?;

    let comment = sqlx::query_as::<_, ArticleCommentRow>(
        r#"
        SELECT
            c.id,
            c.article_id,
            c.user_id,
            c.content,
            c.created_at,
            c.updated_at,
            u.id        AS author_id,
            u.name      AS author_name,
            u.username  AS author_username,
            u.avatar    AS author_avatar
        FROM article_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.id = $1
        "#,
    )
    .bind(comment_id)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(ArticleComment::from(comment))
}

pub async fn delete_article_comment(
    state: &AppState,
    article_id: Uuid,
    comment_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    let result = sqlx::query(
        "DELETE FROM article_comments WHERE id = $1 AND article_id = $2 AND user_id = $3",
    )
    .bind(comment_id)
    .bind(article_id)
    .bind(user_id)
    .execute(&state.db_pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Article not found".to_string()));
    }

    Ok(())
}

pub async fn list_categories(state: &AppState) -> Result<Vec<ArticleCategory>, AppError> {
    let categories = sqlx::query_as::<_, ArticleCategory>(
        "SELECT id, name, slug, description, color, icon FROM categories ORDER BY name",
    )
    .fetch_all(&state.db_pool)
    .await?;

    Ok(categories)
}

pub async fn list_tags(state: &AppState) -> Result<Vec<ArticleTag>, AppError> {
    let tags = sqlx::query_as::<_, ArticleTag>("SELECT id, name, slug FROM tags ORDER BY name")
        .fetch_all(&state.db_pool)
        .await?;

    Ok(tags)
}

fn apply_article_filters(
    builder: &mut QueryBuilder<'_, sqlx::Postgres>,
    filters: &ArticleListFilters,
    apply_default_status: bool,
) {
    if let Some(status) = filters.status.as_ref() {
        builder
            .push(" AND a.status = ")
            .push_bind(status.to_string())
            .push("::article_status");
    } else if apply_default_status {
        builder.push(" AND a.status = 'PUBLISHED'::article_status");
    }

    if let Some(is_premium) = filters.is_premium {
        builder.push(" AND a.is_premium = ").push_bind(is_premium);
    }

    if let Some(author_id) = filters.author_id {
        builder.push(" AND a.author_id = ").push_bind(author_id);
    }

    if let Some(search) = filters.search.as_ref() {
        let pattern = format!("%{}%", search.trim());
        builder
            .push(" AND (a.title ILIKE ")
            .push_bind(pattern.clone())
            .push(" OR a.excerpt ILIKE ")
            .push_bind(pattern)
            .push(")");
    }

    if let Some(category_slug) = filters.category_slug.as_ref() {
        builder
            .push(" AND EXISTS (SELECT 1 FROM article_categories ac JOIN categories cat ON ac.category_id = cat.id WHERE ac.article_id = a.id AND LOWER(cat.slug) = LOWER(")
            .push_bind(category_slug.to_string())
            .push("))");
    }

    if let Some(tag_slug) = filters.tag_slug.as_ref() {
        builder
            .push(" AND EXISTS (SELECT 1 FROM article_tags at JOIN tags t ON at.tag_id = t.id WHERE at.article_id = a.id AND LOWER(t.slug) = LOWER(")
            .push_bind(tag_slug.to_string())
            .push("))");
    }
}

async fn load_article_categories(
    pool: &sqlx::PgPool,
    article_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<ArticleCategory>>, AppError> {
    if article_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query(
        r#"
        SELECT
            ac.article_id,
            c.id,
            c.name,
            c.slug,
            c.description,
            c.color,
            c.icon
        FROM article_categories ac
        JOIN categories c ON c.id = ac.category_id
        WHERE ac.article_id = ANY($1)
        "#,
    )
    .bind(article_ids)
    .map(|row: PgRow| {
        let article_id: Uuid = row.get("article_id");
        let category = ArticleCategory {
            id: row.get("id"),
            name: row.get("name"),
            slug: row.get("slug"),
            description: row.get("description"),
            color: row.get("color"),
            icon: row.get("icon"),
        };
        (article_id, category)
    })
    .fetch_all(pool)
    .await?;

    let mut map: HashMap<Uuid, Vec<ArticleCategory>> = HashMap::new();
    for (article_id, category) in rows {
        map.entry(article_id).or_default().push(category);
    }

    Ok(map)
}

async fn load_article_tags(
    pool: &sqlx::PgPool,
    article_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<ArticleTag>>, AppError> {
    if article_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query(
        r#"
        SELECT
            at.article_id,
            t.id,
            t.name,
            t.slug
        FROM article_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = ANY($1)
        "#,
    )
    .bind(article_ids)
    .map(|row: PgRow| {
        let article_id: Uuid = row.get("article_id");
        let tag = ArticleTag {
            id: row.get("id"),
            name: row.get("name"),
            slug: row.get("slug"),
        };
        (article_id, tag)
    })
    .fetch_all(pool)
    .await?;

    let mut map: HashMap<Uuid, Vec<ArticleTag>> = HashMap::new();
    for (article_id, tag) in rows {
        map.entry(article_id).or_default().push(tag);
    }

    Ok(map)
}

async fn load_viewer_likes(
    pool: &sqlx::PgPool,
    article_ids: &[Uuid],
    viewer_id: Uuid,
) -> Result<HashMap<Uuid, bool>, AppError> {
    if article_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query(
        "SELECT article_id FROM article_likes WHERE article_id = ANY($1) AND user_id = $2",
    )
    .bind(article_ids)
    .bind(viewer_id)
    .fetch_all(pool)
    .await?;

    let mut map = HashMap::new();
    for row in rows {
        let article_id: Uuid = row.get("article_id");
        map.insert(article_id, true);
    }

    Ok(map)
}

async fn set_article_categories(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    article_id: Uuid,
    category_ids: &[Uuid],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM article_categories WHERE article_id = $1")
        .bind(article_id)
        .execute(&mut **tx)
        .await?;

    if !category_ids.is_empty() {
        let mut builder =
            QueryBuilder::new("INSERT INTO article_categories (article_id, category_id) ");
        builder.push_values(category_ids, |mut row, category_id| {
            row.push_bind(article_id).push_bind(category_id);
        });
        builder.build().execute(&mut **tx).await?;
    }

    Ok(())
}

async fn set_article_tags(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    article_id: Uuid,
    tag_ids: &[Uuid],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM article_tags WHERE article_id = $1")
        .bind(article_id)
        .execute(&mut **tx)
        .await?;

    if !tag_ids.is_empty() {
        let mut builder = QueryBuilder::new("INSERT INTO article_tags (article_id, tag_id) ");
        builder.push_values(tag_ids, |mut row, tag_id| {
            row.push_bind(article_id).push_bind(tag_id);
        });
        builder.build().execute(&mut **tx).await?;
    }

    Ok(())
}

async fn validate_categories(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    category_ids: &[Uuid],
) -> Result<(), AppError> {
    if category_ids.is_empty() {
        return Ok(());
    }

    let count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*)::bigint FROM categories WHERE id = ANY($1)")
            .bind(category_ids)
            .fetch_one(&mut **tx)
            .await?;

    if count != category_ids.len() as i64 {
        return Err(AppError::Validation(vec![
            "One or more categories do not exist".to_string(),
        ]));
    }

    Ok(())
}

async fn validate_tags(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tag_ids: &[Uuid],
) -> Result<(), AppError> {
    if tag_ids.is_empty() {
        return Ok(());
    }

    let count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*)::bigint FROM tags WHERE id = ANY($1)")
            .bind(tag_ids)
            .fetch_one(&mut **tx)
            .await?;

    if count != tag_ids.len() as i64 {
        return Err(AppError::Validation(vec![
            "One or more tags do not exist".to_string()
        ]));
    }

    Ok(())
}

async fn generate_unique_article_slug(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    base: &str,
) -> Result<String, AppError> {
    let mut candidate = base.to_string();
    let mut counter = 1;

    loop {
        let exists =
            sqlx::query_scalar::<_, bool>("SELECT EXISTS (SELECT 1 FROM articles WHERE slug = $1)")
                .bind(&candidate)
                .fetch_one(&mut **tx)
                .await?;

        if !exists {
            return Ok(candidate);
        }

        candidate = format!("{}-{}", base, counter);
        counter += 1;
    }
}
