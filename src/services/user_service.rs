use crate::error::AppError;
use crate::models::user::{
    CreatorListResponse, CreatorProfile, CreatorSummary, MeProfile, PublicUser, PublicUserProfile,
    PublicUserProfileRow, User, UserStats,
};
use crate::services::campaign_service::{
    list_campaigns, CampaignListFilters, CampaignListResponse,
};
use crate::state::AppState;
use serde_json::Value;
use sqlx::{Postgres, QueryBuilder};
use uuid::Uuid;

#[derive(Debug, Clone, Default)]
pub struct UpdateUserInput {
    pub name: Option<String>,
    pub username: Option<String>,
    pub bio: Option<String>,
    pub creator_bio: Option<String>,
    pub avatar: Option<String>,
    pub banner_image: Option<String>,
    pub social_links: Option<Value>,
}

pub async fn get_me(state: &AppState, user_id: Uuid) -> Result<MeProfile, AppError> {
    let user = fetch_user_by_id(&state.db_pool, user_id).await?;

    let stats = user_stats(&state.db_pool, user_id).await?;

    Ok(MeProfile {
        user: PublicUser::from(user),
        stats,
    })
}

pub async fn get_user_profile(
    state: &AppState,
    user_id: Uuid,
) -> Result<PublicUserProfile, AppError> {
    let row = sqlx::query_as::<_, PublicUserProfileRow>(
        r#"
        SELECT
            u.id,
            u.name,
            u.username,
            u.avatar,
            u.bio,
            u.created_at,
            (SELECT COUNT(*)::bigint FROM campaigns c WHERE c.creator_id = u.id) AS campaigns_count,
            (SELECT COUNT(*)::bigint FROM donations d WHERE d.donor_id = u.id) AS donations_count
        FROM users u
        WHERE u.id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db_pool)
    .await?;

    row.map(PublicUserProfile::from).ok_or(AppError::NotFound("User not found".to_string()))
}

pub async fn update_user(
    state: &AppState,
    user_id: Uuid,
    mut input: UpdateUserInput,
) -> Result<PublicUser, AppError> {
    sanitize_update_input(&mut input);

    if let Some(username) = &input.username {
        ensure_unique_username(&state.db_pool, username, Some(user_id)).await?;
    }

    let mut builder = QueryBuilder::<Postgres>::new("UPDATE users SET ");
    let mut changes = builder.separated(", ");
    let mut has_changes = false;

    if let Some(name) = &input.name {
        changes.push("name = ").push_bind(name);
        has_changes = true;
    }
    if let Some(username) = &input.username {
        changes.push("username = ").push_bind(username);
        has_changes = true;
    }
    if let Some(bio) = &input.bio {
        changes.push("bio = ").push_bind(bio);
        has_changes = true;
    }
    if let Some(creator_bio) = &input.creator_bio {
        changes.push("creator_bio = ").push_bind(creator_bio);
        has_changes = true;
    }
    if let Some(avatar) = &input.avatar {
        changes.push("avatar = ").push_bind(avatar);
        has_changes = true;
    }
    if let Some(banner_image) = &input.banner_image {
        changes.push("banner_image = ").push_bind(banner_image);
        has_changes = true;
    }
    if let Some(social_links) = &input.social_links {
        changes.push("social_links = ").push_bind(social_links);
        has_changes = true;
    }

    if !has_changes {
        return Err(AppError::Validation(vec![
            "No fields provided for update".to_string()
        ]));
    }

    changes.push("updated_at = NOW()");

    builder.push(" WHERE id = ").push_bind(user_id);
    builder.push(" RETURNING id, email, password_hash, name, username, avatar, banner_image, bio, creator_bio, role, is_creator, social_links, created_at, updated_at");

    let result = builder
        .build_query_as::<User>()
        .fetch_one(&state.db_pool)
        .await
        .map_err(map_unique_error)?;

    Ok(PublicUser::from(result))
}

pub async fn become_creator(state: &AppState, user_id: Uuid) -> Result<PublicUser, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET is_creator = TRUE,
            role = CASE WHEN role = 'USER' THEN 'CREATOR' ELSE role END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, password_hash, name, username, avatar, banner_image, bio, creator_bio, role, is_creator, social_links, created_at, updated_at
        "#,
    )
    .bind(user_id)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(PublicUser::from(user))
}

pub async fn get_creator_by_username(
    state: &AppState,
    username: &str,
) -> Result<CreatorProfile, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password_hash, name, username, avatar, banner_image, bio, creator_bio, role, is_creator, social_links, created_at, updated_at
        FROM users
        WHERE lower(username) = lower($1)
        "#,
    )
    .bind(username.trim())
    .fetch_optional(&state.db_pool)
    .await?
    .ok_or(AppError::NotFound("User not found".to_string()))?;

    if !user.is_creator {
        return Err(AppError::NotFound("User not found".to_string()));
    }

    let stats = user_stats(&state.db_pool, user.id).await?;

    Ok(CreatorProfile {
        user: PublicUser::from(user),
        stats,
    })
}

pub async fn get_all_creators(state: &AppState) -> Result<CreatorListResponse, AppError> {
    let creators = sqlx::query_as::<_, CreatorSummary>(
        r#"
        SELECT id, name, username, avatar, creator_bio, is_creator
        FROM users
        WHERE is_creator = TRUE
        ORDER BY created_at DESC
        LIMIT 50
        "#,
    )
    .fetch_all(&state.db_pool)
    .await?;

    Ok(CreatorListResponse { creators })
}

pub async fn get_user_campaigns(
    state: &AppState,
    user_id: Uuid,
    page: u32,
    limit: u32,
) -> Result<CampaignListResponse, AppError> {
    let filters = CampaignListFilters {
        status: None,
        category: None,
        search: None,
        campaign_type: None,
        creator_id: Some(user_id),
        page,
        limit,
        enforce_active_default: false,
    };

    list_campaigns(state, filters).await
}

async fn fetch_user_by_id(pool: &sqlx::PgPool, user_id: Uuid) -> Result<User, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password_hash, name, username, avatar, banner_image, bio, creator_bio, role, is_creator, social_links, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    user.ok_or(AppError::NotFound("User not found".to_string()))
}

async fn user_stats(pool: &sqlx::PgPool, user_id: Uuid) -> Result<UserStats, AppError> {
    let campaigns = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::bigint FROM campaigns WHERE creator_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let donations =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*)::bigint FROM donations WHERE donor_id = $1")
            .bind(user_id)
            .fetch_one(pool)
            .await?;

    let followers = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*)::bigint FROM follows WHERE following_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    let following =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*)::bigint FROM follows WHERE follower_id = $1")
            .bind(user_id)
            .fetch_one(pool)
            .await?;

    Ok(UserStats {
        campaigns,
        donations,
        followers,
        following,
    })
}

fn sanitize_update_input(input: &mut UpdateUserInput) {
    input.name = clean_string(input.name.take());
    input.username = clean_string(input.username.take());
    input.bio = clean_string_allow_empty(input.bio.take());
    input.creator_bio = clean_string_allow_empty(input.creator_bio.take());
    input.avatar = clean_string(input.avatar.take());
    input.banner_image = clean_string(input.banner_image.take());

    if let Some(value) = input.social_links.take() {
        input.social_links = match value {
            Value::Null => None,
            other => Some(other),
        };
    }
}

fn clean_string(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn clean_string_allow_empty(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

async fn ensure_unique_username(
    pool: &sqlx::PgPool,
    username: &str,
    current_user_id: Option<Uuid>,
) -> Result<(), AppError> {
    let exists = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM users WHERE lower(username) = lower($1) LIMIT 1",
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;

    if let Some(existing_id) = exists {
        if Some(existing_id) != current_user_id {
            return Err(AppError::Validation(vec![
                "Username is already in use".to_string()
            ]));
        }
    }

    Ok(())
}

fn map_unique_error(error: sqlx::Error) -> AppError {
    match error {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("users_username_key") => {
            AppError::Validation(vec!["Username is already in use".to_string()])
        }
        other => AppError::from(other),
    }
}
