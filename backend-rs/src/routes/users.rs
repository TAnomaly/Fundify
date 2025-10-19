use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use tracing::instrument;
use uuid::Uuid;

use crate::{
    auth::MaybeAuthUser,
    error::AppError,
    models::{
        campaign::CreatorCampaign,
        creator::{CreatorProfile, CreatorSummary, MembershipTier},
    },
    state::AppState,
    utils::slugify,
};

#[derive(Debug, Serialize)]
struct CreatorSummaryResponse {
    id: Uuid,
    name: String,
    username: Option<String>,
    email: String,
    avatar: Option<String>,
    banner_image: Option<String>,
    creator_bio: Option<String>,
    #[serde(default)]
    subscriber_count: i64,
    #[serde(default)]
    post_count: i64,
}

#[derive(Debug, Serialize)]
struct CreatorProfileResponse {
    user: CreatorProfileDTO,
    campaign: CreatorCampaignDTO,
    tiers: Vec<MembershipTierDTO>,
}

#[derive(Debug, Serialize)]
struct CreatorProfileDTO {
    id: Uuid,
    name: String,
    username: Option<String>,
    email: String,
    avatar: Option<String>,
    banner_image: Option<String>,
    creator_bio: Option<String>,
    social_links: Option<serde_json::Value>,
    created_at: DateTime<Utc>,
    follower_count: i64,
    following_count: i64,
    #[serde(default)]
    is_following: bool,
}

#[derive(Debug, Serialize)]
struct CreatorCampaignDTO {
    id: Uuid,
    title: String,
    slug: String,
    description: String,
    story: String,
    category: String,
    campaign_type: String,
    status: String,
    cover_image: String,
    images: Vec<String>,
    video_url: Option<String>,
    goal_amount: f64,
    current_amount: f64,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
    metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct MembershipTierDTO {
    id: Uuid,
    name: String,
    description: Option<String>,
    price: f64,
    benefits: Vec<String>,
    is_active: bool,
    current_subscribers: i64,
    has_exclusive_content: bool,
    has_early_access: bool,
    has_priority_support: bool,
    custom_perks: Option<serde_json::Value>,
    max_subscribers: Option<i32>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/creators", get(list_creators))
        .route("/creator/:slug", get(get_creator_profile))
}

#[instrument(skip(state))]
async fn list_creators(State(state): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let records: Vec<CreatorSummary> = sqlx::query_as(
        r#"
        SELECT
            u.id,
            u.name,
            u.username,
            u.email,
            u.avatar,
            u."bannerImage" AS banner_image,
            u."creatorBio" AS creator_bio,
            COALESCE(sub_counts.subscriber_count, 0) AS subscriber_count,
            COALESCE(post_counts.post_count, 0) AS post_count
        FROM "User" u
        LEFT JOIN (
            SELECT "creatorId" AS creator_id, COUNT(*)::bigint AS subscriber_count
            FROM "Subscription"
            WHERE status = 'ACTIVE'
            GROUP BY "creatorId"
        ) sub_counts ON sub_counts.creator_id = u.id
        LEFT JOIN (
            SELECT "authorId" AS author_id, COUNT(*)::bigint AS post_count
            FROM "CreatorPost"
            GROUP BY "authorId"
        ) post_counts ON post_counts.author_id = u.id
        WHERE u."isCreator" = true
        ORDER BY subscriber_count DESC, u."createdAt" DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    let payload: Vec<CreatorSummaryResponse> = records
        .into_iter()
        .map(|c| CreatorSummaryResponse {
            id: c.id,
            name: c.name,
            username: c.username,
            email: c.email,
            avatar: c.avatar,
            banner_image: c.banner_image,
            creator_bio: c.creator_bio,
            subscriber_count: c.subscriber_count.unwrap_or(0),
            post_count: c.post_count.unwrap_or(0),
        })
        .collect();

    Ok(Json(serde_json::json!({
        "success": true,
        "data": payload,
    })))
}

#[instrument(skip(state, maybe_user))]
async fn get_creator_profile(
    Path(slug): Path<String>,
    State(state): State<AppState>,
    maybe_user: MaybeAuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let normalized_name = slug.replace('-', " ");

    let creator = sqlx::query_as::<_, CreatorProfile>(
        r#"
        SELECT
            u.id,
            u.name,
            u.username,
            u.email,
            u.avatar,
            u."bannerImage" AS banner_image,
            u."creatorBio" AS creator_bio,
            u."socialLinks" AS social_links,
            u."createdAt" AS created_at,
            COALESCE(follower_counts.followers, 0) AS follower_count,
            COALESCE(following_counts.following, 0) AS following_count
        FROM "User" u
        LEFT JOIN (
            SELECT "followingId", COUNT(*)::bigint AS followers
            FROM "Follow"
            GROUP BY "followingId"
        ) follower_counts ON follower_counts."followingId" = u.id
        LEFT JOIN (
            SELECT "followerId", COUNT(*)::bigint AS following
            FROM "Follow"
            GROUP BY "followerId"
        ) following_counts ON following_counts."followerId" = u.id
        WHERE u."isCreator" = true
          AND (
              LOWER(u.username) = LOWER($1)
              OR LOWER(u.name) = LOWER($2)
          )
        LIMIT 1
        "#,
    )
    .bind(&slug)
    .bind(&normalized_name)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let viewer_id = maybe_user.0.as_ref().map(|c| c.user_id.clone());
    let is_following = if let Some(viewer) = viewer_id.as_deref() {
        if viewer == creator.id.to_string() {
            false
        } else {
            sqlx::query_scalar(
                r#"
                SELECT EXISTS (
                    SELECT 1 FROM "Follow"
                    WHERE "followerId" = $1 AND "followingId" = $2
                )
                "#,
            )
            .bind(viewer)
            .bind(creator.id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(false)
        }
    } else {
        false
    };

    let existing_campaign = sqlx::query_as::<_, CreatorCampaign>(
        r#"
        SELECT
            c.id,
            c.title,
            c.slug,
            c.description,
            c.story,
            c.category,
            c."type" AS campaign_type,
            c.status,
            c."coverImage" AS cover_image,
            COALESCE(c.images, '{}'::text[]) AS images,
            c."videoUrl" AS video_url,
            c."goalAmount" AS goal_amount,
            c."currentAmount" AS current_amount,
            c."startDate" AS start_date,
            c."endDate" AS end_date,
            c.metadata
        FROM "Campaign" c
        WHERE c."creatorId" = $1 AND c."type" = 'CREATOR'
        ORDER BY c."createdAt" DESC
        LIMIT 1
        "#,
    )
    .bind(creator.id)
    .fetch_optional(&state.pool)
    .await?;

    let campaign = if let Some(campaign) = existing_campaign {
        campaign
    } else {
        let slug_seed = creator
            .username
            .clone()
            .unwrap_or_else(|| slugify(&creator.name));
        let generated_slug = format!("{}-creator-{}", slug_seed, chrono::Utc::now().timestamp());
        let cover_image = creator.avatar.clone().unwrap_or_else(|| {
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80".to_string()
        });

        sqlx::query_as::<_, CreatorCampaign>(
            r#"
            INSERT INTO "Campaign" (
                title,
                slug,
                description,
                story,
                category,
                "type",
                status,
                "goalAmount",
                "currentAmount",
                "coverImage",
                "creatorId",
                "startDate",
                "endDate",
                images
            ) VALUES (
                $1,
                $2,
                $3,
                $4,
                'OTHER',
                'CREATOR',
                'ACTIVE',
                0,
                0,
                $5,
                $6,
                NOW(),
                NOW() + INTERVAL '365 days',
                '{}'::text[]
            )
            RETURNING
                id,
                title,
                slug,
                description,
                story,
                category,
                "type" AS campaign_type,
                status,
                "coverImage" AS cover_image,
                COALESCE(images, '{}'::text[]) AS images,
                "videoUrl" AS video_url,
                "goalAmount" AS goal_amount,
                "currentAmount" AS current_amount,
                "startDate" AS start_date,
                "endDate" AS end_date,
                metadata
            "#,
        )
        .bind(format!("{}'s Creator Page", creator.name))
        .bind(&generated_slug)
        .bind(format!("Support {} and get exclusive content!", creator.name))
        .bind("Welcome to my creator page! Subscribe to get exclusive access to my content and support my work.")
        .bind(&cover_image)
        .bind(creator.id)
        .fetch_one(&state.pool)
        .await?
    };

    let tiers: Vec<MembershipTier> = sqlx::query_as(
        r#"
        SELECT
            t.id,
            t.name,
            t.description,
            t.price,
            t.perks,
            t."hasExclusiveContent" AS has_exclusive_content,
            t."hasEarlyAccess" AS has_early_access,
            t."hasPrioritySupport" AS has_priority_support,
            t."customPerks" AS custom_perks,
            t."maxSubscribers" AS max_subscribers,
            t."currentSubscribers" AS current_subscribers,
            t."isActive" AS is_active
        FROM "MembershipTier" t
        WHERE t."campaignId" = $1 AND t."isActive" = true
        ORDER BY t.price ASC
        "#,
    )
    .bind(campaign.id)
    .fetch_all(&state.pool)
    .await?;

    let profile = CreatorProfileDTO {
        id: creator.id,
        name: creator.name,
        username: creator.username,
        email: creator.email,
        avatar: creator.avatar,
        banner_image: creator.banner_image,
        creator_bio: creator.creator_bio,
        social_links: creator.social_links,
        created_at: creator.created_at,
        follower_count: creator.follower_count,
        following_count: creator.following_count,
        is_following,
    };

    let campaign_dto = CreatorCampaignDTO {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        description: campaign.description,
        story: campaign.story,
        category: campaign.category,
        campaign_type: campaign.campaign_type,
        status: campaign.status,
        cover_image: campaign.cover_image,
        images: campaign.images,
        video_url: campaign.video_url,
        goal_amount: campaign.goal_amount,
        current_amount: campaign.current_amount,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        metadata: campaign.metadata,
    };

    let tiers_dto = tiers
        .into_iter()
        .map(|tier| {
            let MembershipTier {
                id,
                name,
                description,
                price,
                perks,
                has_exclusive_content,
                has_early_access,
                has_priority_support,
                custom_perks,
                max_subscribers,
                current_subscribers,
                is_active,
            } = tier;

            MembershipTierDTO {
                id,
                name,
                description: Some(description),
                price,
                benefits: perks,
                is_active,
                current_subscribers: current_subscribers as i64,
                has_exclusive_content,
                has_early_access,
                has_priority_support,
                custom_perks,
                max_subscribers,
            }
        })
        .collect::<Vec<_>>();

    let payload = CreatorProfileResponse {
        user: profile,
        campaign: campaign_dto,
        tiers: tiers_dto,
    };

    Ok(Json(serde_json::json!({
        "success": true,
        "data": payload,
    })))
}
