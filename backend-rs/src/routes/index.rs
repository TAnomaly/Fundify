use axum::{routing::get, Router};

use crate::state::AppState;

use super::{
    analytics::analytics_router, auth::auth_router, comments::comments_router, digital_products::digital_products_router, downloads::downloads_router, feed::feed_router, goals::goals_router, membership_tiers::membership_tiers_router, 
    messages::messages_router, notifications::notifications_router, polls::polls_router, posts::posts_router, public::public_router, referrals::referrals_router, scheduled_posts::scheduled_posts_router, stripe::stripe_router, subscriptions::subscriptions_router, uploads::uploads_router, welcome_messages::welcome_messages_router, webhooks::webhooks_router, withdrawals::withdrawals_router,
};

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(|| async { "OK" }))
        .merge(auth_router())
        .merge(public_router())
        .merge(uploads_router())
        .merge(analytics_router())
        .merge(posts_router())
        .nest("/comments", comments_router())
        .nest("/withdrawals", withdrawals_router())
        .nest("/memberships", membership_tiers_router())
        .nest("/subscriptions", subscriptions_router())
        .nest("/stripe", stripe_router())
        .nest("/webhooks", webhooks_router())
        .nest("/polls", polls_router())
        .nest("/goals", goals_router())
        .nest("/downloads", downloads_router())
        .nest("/messages", messages_router())
        .nest("/scheduled-posts", scheduled_posts_router())
        .nest("/welcome-messages", welcome_messages_router())
        .nest("/referrals", referrals_router())
        .nest("/notifications", notifications_router())
        .nest("/feed", feed_router())
        .merge(digital_products_router())
}
