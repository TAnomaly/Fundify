use axum::extract::{Path, State};
use axum::response::IntoResponse;
use axum::Extension;
use serde::Serialize;
use uuid::Uuid;

use crate::middleware::auth::AuthUser;
use crate::models::user::User;
use crate::utils::{
    app_state::AppState,
    error::{AppError, AppResult},
    response::ApiResponse,
};

#[derive(Serialize)]
pub struct CreatorResponse {
    pub id: String,
    pub name: String,
    pub username: Option<String>,
    pub email: String,
    pub avatar: Option<String>,
    #[serde(rename = "creatorBio")]
    pub creator_bio: Option<String>,
    #[serde(rename = "isCreator")]
    pub is_creator: bool,
    #[serde(rename = "subscriberCount")]
    pub subscriber_count: i64,
    #[serde(rename = "postCount")]
    pub post_count: i64,
}

#[derive(Serialize)]
pub struct CreatorProfileResponse {
    pub user: UserProfile,
    pub campaign: Option<CampaignInfo>,
    pub tiers: Vec<TierInfo>,
}

#[derive(Serialize)]
pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub username: Option<String>,
    pub email: String,
    pub avatar: Option<String>,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    #[serde(rename = "creatorBio")]
    pub creator_bio: Option<String>,
    #[serde(rename = "socialLinks")]
    pub social_links: Option<serde_json::Value>,
    #[serde(rename = "isCreator")]
    pub is_creator: bool,
    #[serde(rename = "followerCount")]
    pub follower_count: i64,
    #[serde(rename = "followingCount")]
    pub following_count: i64,
    #[serde(rename = "isFollowing")]
    pub is_following: bool,
}

#[derive(Serialize)]
pub struct CampaignInfo {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub description: String,
    pub story: Option<String>,
    pub category: String,
    #[serde(rename = "type")]
    pub campaign_type: String,
    pub status: String,
    #[serde(rename = "goalAmount")]
    pub goal_amount: f64,
    #[serde(rename = "currentAmount")]
    pub current_amount: f64,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
}

#[derive(Serialize)]
pub struct TierInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "currentSubscribers")]
    pub current_subscribers: i64,
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<impl IntoResponse> {
    let user: Option<User> = sqlx::query_as::<_, User>(
        r#"SELECT id, email, password, name, username, avatar, "bannerImage" as banner_image, bio,
           role as "role: _", "emailVerified" as email_verified, "githubId" as github_id,
           "isCreator" as is_creator, "creatorBio" as creator_bio, "socialLinks" as social_links,
           "stripeCustomerId" as stripe_customer_id, "stripeAccountId" as stripe_account_id,
           "stripeOnboardingComplete" as stripe_onboarding_complete,
           "createdAt" as created_at, "updatedAt" as updated_at
        FROM "User" WHERE id = $1"#,
    )
    .bind(id.to_string())
    .fetch_optional(&state.db)
    .await?;

    let user = user.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(ApiResponse::success(user))
}

pub async fn update_user(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> AppResult<impl IntoResponse> {
    Ok(ApiResponse::success("User updated - TODO"))
}

pub async fn get_creators(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let rows = sqlx::query(
        r#"SELECT u.id, u.name, u.username, u.email, u.avatar, u."creatorBio", u."isCreator",
           COUNT(DISTINCT s.id) as subscriber_count,
           COUNT(DISTINCT p.id) as post_count
        FROM "User" u
        LEFT JOIN "Subscription" s ON u.id = s."creatorId"
        LEFT JOIN "CreatorPost" p ON u.id = p."authorId"
        WHERE u."isCreator" = true
        GROUP BY u.id, u.name, u.username, u.email, u.avatar, u."creatorBio", u."isCreator"
        ORDER BY u."createdAt" DESC
        LIMIT 50"#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut response: Vec<CreatorResponse> = Vec::new();
    for row in rows {
        use sqlx::Row;
        response.push(CreatorResponse {
            id: row.get("id"),
            name: row.get("name"),
            username: row.get("username"),
            email: row.get("email"),
            avatar: row.get("avatar"),
            creator_bio: row.get("creatorBio"),
            is_creator: row.get("isCreator"),
            subscriber_count: row.get("subscriber_count"),
            post_count: row.get("post_count"),
        });
    }

    Ok(ApiResponse::success(response))
}

pub async fn get_creator_by_username(
    State(state): State<AppState>,
    Path(username): Path<String>,
    auth_user: Option<Extension<AuthUser>>,
) -> AppResult<impl IntoResponse> {
    let viewer_id = auth_user.map(|u| u.id.to_string());
    let normalized_name = username.replace('-', " ");

    // Find user by username or name
    let user_row = sqlx::query(
        r#"SELECT u.id, u.name, u.username, u.email, u.avatar, u."bannerImage", u."creatorBio",
           u."socialLinks", u."isCreator",
           COUNT(DISTINCT f1.id) as follower_count,
           COUNT(DISTINCT f2.id) as following_count
        FROM "User" u
        LEFT JOIN "Follow" f1 ON u.id = f1."followingId"
        LEFT JOIN "Follow" f2 ON u.id = f2."followerId"
        WHERE u."isCreator" = true AND (LOWER(u.username) = LOWER($1) OR LOWER(u.name) = LOWER($2))
        GROUP BY u.id, u.name, u.username, u.email, u.avatar, u."bannerImage", u."creatorBio", u."socialLinks", u."isCreator""#
    )
    .bind(&username)
    .bind(&normalized_name)
    .fetch_optional(&state.db)
    .await?;

    let user_row = user_row.ok_or_else(|| AppError::NotFound("Creator not found".to_string()))?;

    use sqlx::Row;
    let user_id: String = user_row.get("id");
    let user_name: String = user_row.get("name");
    let user_username: Option<String> = user_row.get("username");
    let user_email: String = user_row.get("email");
    let user_avatar: Option<String> = user_row.get("avatar");
    let user_banner: Option<String> = user_row.get("bannerImage");
    let user_bio: Option<String> = user_row.get("creatorBio");
    let user_social: Option<serde_json::Value> = user_row.get("socialLinks");
    let user_is_creator: bool = user_row.get("isCreator");
    let follower_count: i64 = user_row.get("follower_count");
    let following_count: i64 = user_row.get("following_count");

    // Check if viewer is following this creator
    let is_following = if let Some(ref vid) = viewer_id {
        if vid != &user_id {
            let follow: Option<(String,)> = sqlx::query_as(
                r#"SELECT id FROM "Follow" WHERE "followerId" = $1 AND "followingId" = $2"#,
            )
            .bind(vid)
            .bind(&user_id)
            .fetch_optional(&state.db)
            .await?;
            follow.is_some()
        } else {
            false
        }
    } else {
        false
    };

    // Get or create CREATOR campaign
    let campaign_row = sqlx::query(
        r#"SELECT id, title, slug, description, story, category, type, status,
           "goalAmount", "currentAmount", "coverImage"
        FROM "Campaign"
        WHERE "creatorId" = $1 AND type = 'CREATOR'
        LIMIT 1"#,
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await?;

    let campaign_info = if let Some(camp_row) = campaign_row {
        Some(CampaignInfo {
            id: camp_row.get("id"),
            title: camp_row.get("title"),
            slug: camp_row.get("slug"),
            description: camp_row.get("description"),
            story: camp_row.get("story"),
            category: camp_row.get("category"),
            campaign_type: camp_row.get("type"),
            status: camp_row.get("status"),
            goal_amount: camp_row.get("goalAmount"),
            current_amount: camp_row.get("currentAmount"),
            cover_image: camp_row.get("coverImage"),
        })
    } else {
        // Auto-create campaign if it doesn't exist
        let slug = format!(
            "{}-creator-{}",
            user_name.to_lowercase().replace(' ', "-"),
            chrono::Utc::now().timestamp()
        );
        let campaign_id = uuid::Uuid::new_v4().to_string();

        sqlx::query(
            r#"INSERT INTO "Campaign"
            (id, title, slug, description, story, category, type, status, "goalAmount", "currentAmount",
             "coverImage", "startDate", "endDate", "creatorId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())"#
        )
        .bind(&campaign_id)
        .bind(format!("{}'s Creator Page", user_name))
        .bind(&slug)
        .bind(format!("Support {} and get exclusive content!", user_name))
        .bind("Welcome to my creator page! Subscribe to get exclusive access to my content and support my work.")
        .bind("OTHER")
        .bind("CREATOR")
        .bind("ACTIVE")
        .bind(0.0)
        .bind(0.0)
        .bind(user_avatar.clone().unwrap_or_else(|| "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80".to_string()))
        .bind(chrono::Utc::now().naive_utc())
        .bind((chrono::Utc::now() + chrono::Duration::days(365)).naive_utc())
        .bind(&user_id)
        .execute(&state.db)
        .await?;

        Some(CampaignInfo {
            id: campaign_id.clone(),
            title: format!("{}'s Creator Page", user_name),
            slug: slug.clone(),
            description: format!("Support {} and get exclusive content!", user_name),
            story: Some("Welcome to my creator page! Subscribe to get exclusive access to my content and support my work.".to_string()),
            category: "OTHER".to_string(),
            campaign_type: "CREATOR".to_string(),
            status: "ACTIVE".to_string(),
            goal_amount: 0.0,
            current_amount: 0.0,
            cover_image: user_avatar.clone(),
        })
    };

    // Get membership tiers
    let tier_rows = if let Some(ref campaign) = campaign_info {
        sqlx::query(
            r#"SELECT t.id, t.name, t.description, t.price, t."isActive",
               COUNT(s.id) as subscriber_count
            FROM "MembershipTier" t
            LEFT JOIN "Subscription" s ON t.id = s."tierId"
            WHERE t."campaignId" = $1 AND t."isActive" = true
            GROUP BY t.id, t.name, t.description, t.price, t."isActive"
            ORDER BY t.price ASC"#,
        )
        .bind(&campaign.id)
        .fetch_all(&state.db)
        .await?
    } else {
        vec![]
    };

    let mut tier_infos: Vec<TierInfo> = Vec::new();
    for tier_row in tier_rows {
        tier_infos.push(TierInfo {
            id: tier_row.get("id"),
            name: tier_row.get("name"),
            description: tier_row.get("description"),
            price: tier_row.get("price"),
            is_active: tier_row.get("isActive"),
            current_subscribers: tier_row.get("subscriber_count"),
        });
    }

    let user_profile = UserProfile {
        id: user_id,
        name: user_name,
        username: user_username,
        email: user_email,
        avatar: user_avatar,
        banner_image: user_banner,
        creator_bio: user_bio,
        social_links: user_social,
        is_creator: user_is_creator,
        follower_count,
        following_count,
        is_following,
    };

    let response = CreatorProfileResponse {
        user: user_profile,
        campaign: campaign_info,
        tiers: tier_infos,
    };

    Ok(ApiResponse::success(response))
}
