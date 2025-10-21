use std::collections::HashMap;

use axum::extract::{Path, Query, State};
use chrono::{DateTime, NaiveDateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use uuid::Uuid;

use crate::utils::{app_state::AppState, error::AppResult, response::ApiResponse};

#[derive(Debug, Deserialize)]
pub struct ListPollsQuery {
    pub page: Option<i32>,
    pub limit: Option<i32>,
    #[serde(rename = "creatorId")]
    pub creator_id: Option<Uuid>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: i32,
    pub limit: i32,
    pub total: i64,
    pub pages: i32,
}

#[derive(Debug, Serialize)]
pub struct PollCreator {
    pub id: String,
    pub name: String,
    pub avatar: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PollItem {
    pub id: String,
    pub question: String,
    pub options: Vec<String>,
    #[serde(rename = "expiresAt")]
    pub expires_at: Option<String>,
    #[serde(rename = "multipleChoice")]
    pub multiple_choice: bool,
    #[serde(rename = "allowAddOption")]
    pub allow_add_option: bool,
    #[serde(rename = "isPublic")]
    pub is_public: bool,
    #[serde(rename = "minimumTierId")]
    pub minimum_tier_id: Option<String>,
    #[serde(rename = "totalVotes")]
    pub total_votes: i64,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub creator: PollCreator,
    #[serde(rename = "voteCounts")]
    pub vote_counts: Vec<i64>,
}

#[derive(Debug, Serialize)]
pub struct PollListResponse {
    pub polls: Vec<PollItem>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, FromRow)]
struct PollRow {
    id: Uuid,
    question: String,
    options: Vec<String>,
    expires_at: Option<NaiveDateTime>,
    multiple_choice: bool,
    allow_add_option: bool,
    is_public: bool,
    minimum_tier_id: Option<String>,
    total_votes: i64,
    is_active: bool,
    created_at: NaiveDateTime,
    updated_at: NaiveDateTime,
    creator_id: Uuid,
    creator_name: String,
    creator_avatar: Option<String>,
}

fn format_datetime(value: NaiveDateTime) -> String {
    DateTime::<Utc>::from_naive_utc_and_offset(value, Utc)
        .to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn format_optional_datetime(value: Option<NaiveDateTime>) -> Option<String> {
    value.map(format_datetime)
}

pub async fn list_polls(
    State(state): State<AppState>,
    Query(params): Query<ListPollsQuery>,
) -> AppResult<impl axum::response::IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut polls_query = sqlx::QueryBuilder::new(
        r#"
        SELECT
            p.id,
            p.question,
            p.options,
            p."expiresAt" AS expires_at,
            p."multipleChoice" AS multiple_choice,
            p."allowAddOption" AS allow_add_option,
            p."isPublic" AS is_public,
            p."minimumTierId" AS minimum_tier_id,
            p."totalVotes" AS total_votes,
            p."isActive" AS is_active,
            p."createdAt" AS created_at,
            p."updatedAt" AS updated_at,
            u.id AS creator_id,
            u.name AS creator_name,
            u.avatar AS creator_avatar
        FROM "Poll" p
        LEFT JOIN "User" u ON u.id = p."creatorId"
        WHERE 1=1
        "#,
    );

    if let Some(creator_id) = params.creator_id {
        polls_query
            .push(" AND p.\"creatorId\" = ")
            .push_bind(creator_id);
    }

    if let Some(is_active) = params.is_active {
        if is_active {
            polls_query.push(" AND p.\"isActive\" = TRUE");
        } else {
            polls_query.push(" AND p.\"isActive\" = FALSE");
        }
    }

    polls_query
        .push(" ORDER BY p.\"createdAt\" DESC LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);

    let rows: Vec<PollRow> = polls_query.build_query_as().fetch_all(&state.db).await?;

    let mut count_query =
        sqlx::QueryBuilder::new(r#"SELECT COUNT(*)::BIGINT AS total FROM "Poll" p WHERE 1=1"#);

    if let Some(creator_id) = params.creator_id {
        count_query
            .push(" AND p.\"creatorId\" = ")
            .push_bind(creator_id);
    }

    if let Some(is_active) = params.is_active {
        if is_active {
            count_query.push(" AND p.\"isActive\" = TRUE");
        } else {
            count_query.push(" AND p.\"isActive\" = FALSE");
        }
    }

    let total: i64 = count_query
        .build_query_scalar()
        .fetch_one(&state.db)
        .await?;

    let pages = if total == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as i32
    };

    let poll_ids: Vec<Uuid> = rows.iter().map(|row| row.id).collect();
    let vote_counts_map = load_poll_vote_counts(&state, &poll_ids).await?;

    let polls = rows
        .into_iter()
        .map(|row| {
            let option_votes = vote_counts_map.get(&row.id).cloned().unwrap_or_default();

            let mut vote_counts = vec![0_i64; row.options.len()];
            for (index, count) in option_votes {
                if let Some(slot) = vote_counts.get_mut(index as usize) {
                    *slot = count;
                }
            }

            PollItem {
                id: row.id.to_string(),
                question: row.question,
                options: row.options,
                expires_at: format_optional_datetime(row.expires_at),
                multiple_choice: row.multiple_choice,
                allow_add_option: row.allow_add_option,
                is_public: row.is_public,
                minimum_tier_id: row.minimum_tier_id,
                total_votes: row.total_votes,
                is_active: row.is_active,
                created_at: format_datetime(row.created_at),
                updated_at: format_datetime(row.updated_at),
                creator: PollCreator {
                    id: row.creator_id.to_string(),
                    name: row.creator_name,
                    avatar: row.creator_avatar,
                },
                vote_counts,
            }
        })
        .collect::<Vec<_>>();

    let payload = PollListResponse {
        polls,
        pagination: PaginationInfo {
            page,
            limit,
            total,
            pages,
        },
    };

    Ok(ApiResponse::success(payload))
}

pub async fn create_poll(
    State(_state): State<AppState>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Create poll - TODO"))
}

pub async fn vote_poll(
    State(_state): State<AppState>,
    Path(_id): Path<Uuid>,
) -> AppResult<impl axum::response::IntoResponse> {
    Ok(ApiResponse::success("Vote poll - TODO"))
}

async fn load_poll_vote_counts(
    state: &AppState,
    poll_ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<(i32, i64)>>, sqlx::Error> {
    if poll_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = sqlx::query(
        r#"
        SELECT
            "pollId" AS poll_id,
            "optionIndex" AS option_index,
            COUNT(*)::BIGINT AS vote_count
        FROM "PollVote"
        WHERE "pollId" = ANY($1)
        GROUP BY "pollId", "optionIndex"
        "#,
    )
    .bind(poll_ids)
    .fetch_all(&state.db)
    .await?;

    let mut map: HashMap<Uuid, Vec<(i32, i64)>> = HashMap::new();

    for row in rows {
        let poll_id: Uuid = row.get("poll_id");
        let option_index: i32 = row.get("option_index");
        let vote_count: i64 = row.get("vote_count");

        map.entry(poll_id)
            .or_default()
            .push((option_index, vote_count));
    }

    Ok(map)
}
