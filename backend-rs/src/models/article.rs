use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleSummary {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub status: String,
    pub is_public: bool,
    pub is_premium: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub read_time: Option<i32>,
    pub view_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author: ArticleAuthor,
    pub categories: Vec<ArticleCategory>,
    pub tags: Vec<ArticleTag>,
    pub liked: bool,
    pub likes_count: i64,
    pub comments_count: i64,
}

#[derive(Debug, FromRow)]
pub struct ArticleSummaryRow {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub cover_image: Option<String>,
    pub status: String,
    pub is_public: bool,
    pub is_premium: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub read_time: Option<i32>,
    pub view_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author_id: Uuid,
    pub author_name: String,
    pub author_username: Option<String>,
    pub author_avatar: Option<String>,
    pub likes_count: i64,
    pub comments_count: i64,
    pub viewer_liked: Option<bool>,
}

impl ArticleSummaryRow {
    pub fn into_summary(
        self,
        categories: Vec<ArticleCategory>,
        tags: Vec<ArticleTag>,
    ) -> ArticleSummary {
        ArticleSummary {
            id: self.id,
            slug: self.slug,
            title: self.title,
            excerpt: self.excerpt,
            cover_image: self.cover_image,
            status: self.status,
            is_public: self.is_public,
            is_premium: self.is_premium,
            published_at: self.published_at,
            read_time: self.read_time,
            view_count: self.view_count,
            created_at: self.created_at,
            updated_at: self.updated_at,
            author: ArticleAuthor {
                id: self.author_id,
                name: self.author_name,
                username: self.author_username,
                avatar: self.author_avatar,
            },
            categories,
            tags,
            liked: self.viewer_liked.unwrap_or(false),
            likes_count: self.likes_count,
            comments_count: self.comments_count,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleDetail {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub content: String,
    pub cover_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub keywords: Vec<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub read_time: Option<i32>,
    pub view_count: i32,
    pub is_public: bool,
    pub is_premium: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author: ArticleAuthor,
    pub categories: Vec<ArticleCategory>,
    pub tags: Vec<ArticleTag>,
    pub liked: bool,
    pub likes_count: i64,
    pub comments_count: i64,
}

#[derive(Debug, FromRow)]
pub struct ArticleDetailRow {
    pub id: Uuid,
    pub slug: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub content: String,
    pub cover_image: Option<String>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub keywords: Vec<String>,
    pub status: String,
    pub published_at: Option<DateTime<Utc>>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub read_time: Option<i32>,
    pub view_count: i32,
    pub is_public: bool,
    pub is_premium: bool,
    pub minimum_tier_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author_id: Uuid,
    pub author_name: String,
    pub author_username: Option<String>,
    pub author_avatar: Option<String>,
    pub likes_count: i64,
    pub comments_count: i64,
    pub viewer_liked: Option<bool>,
}

impl ArticleDetailRow {
    pub fn into_detail(
        self,
        categories: Vec<ArticleCategory>,
        tags: Vec<ArticleTag>,
    ) -> ArticleDetail {
        let ArticleDetailRow {
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
            view_count,
            is_public,
            is_premium,
            minimum_tier_id,
            created_at,
            updated_at,
            author_id,
            author_name,
            author_username,
            author_avatar,
            likes_count,
            comments_count,
            viewer_liked,
        } = self;

        ArticleDetail {
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
            view_count,
            is_public,
            is_premium,
            minimum_tier_id,
            created_at,
            updated_at,
            author: ArticleAuthor {
                id: author_id,
                name: author_name,
                username: author_username,
                avatar: author_avatar,
            },
            categories,
            tags,
            liked: viewer_liked.unwrap_or(false),
            likes_count,
            comments_count,
        }
    }
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ArticleCategory {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ArticleTag {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleAuthor {
    pub id: Uuid,
    pub name: String,
    pub username: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleComment {
    pub id: Uuid,
    pub article_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author: ArticleAuthor,
}

#[derive(Debug, FromRow)]
pub struct ArticleCommentRow {
    pub id: Uuid,
    pub article_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub author_id: Uuid,
    pub author_name: String,
    pub author_username: Option<String>,
    pub author_avatar: Option<String>,
}

impl From<ArticleCommentRow> for ArticleComment {
    fn from(row: ArticleCommentRow) -> Self {
        Self {
            id: row.id,
            article_id: row.article_id,
            user_id: row.user_id,
            content: row.content,
            created_at: row.created_at,
            updated_at: row.updated_at,
            author: ArticleAuthor {
                id: row.author_id,
                name: row.author_name,
                username: row.author_username,
                avatar: row.author_avatar,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleListResponse {
    pub articles: Vec<ArticleSummary>,
    pub pagination: ArticlePagination,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticlePagination {
    pub page: u32,
    pub limit: u32,
    pub total: i64,
    pub pages: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleLikeResponse {
    pub liked: bool,
    pub likes_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArticleCommentsResponse {
    pub comments: Vec<ArticleComment>,
}
