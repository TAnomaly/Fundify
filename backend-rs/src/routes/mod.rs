pub mod analytics;
pub mod articles;
pub mod auth;
pub mod campaigns;
pub mod comments;
pub mod creator_posts;
pub mod digital_products;
pub mod donations;
pub mod downloads;
pub mod events;
pub mod feed;
pub mod goals;
pub mod health;
pub mod membership_tiers;
pub mod messages;
pub mod notifications;
pub mod podcasts;
pub mod polls;
pub mod post_engagement;
pub mod referrals;
pub mod scheduled_posts;
pub mod stripe;
pub mod subscriptions;
pub mod uploads;
pub mod users;
pub mod webhooks;
pub mod welcome_messages;
pub mod withdrawals;

use axum::Router;
use tower_http::cors::{CorsLayer, Any};

use crate::state::SharedState;

pub fn create_router(state: SharedState) -> Router {
    // Configure CORS to allow all origins (production should restrict this)
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false);

    Router::new()
        .merge(health::router())
        .nest("/api/v1", api_router())
        .layer(cors)
        .with_state(state)
}

fn api_router() -> Router<SharedState> {
    Router::new()
        .merge(analytics::router())
        .merge(auth::router())
        .merge(articles::router())
        .merge(campaigns::router())
        .merge(comments::router())
        .merge(creator_posts::router())
        .merge(digital_products::router())
        .merge(donations::router())
        .merge(downloads::router())
        .merge(events::router())
        .merge(feed::router())
        .merge(goals::router())
        .merge(membership_tiers::router())
        .merge(messages::router())
        .merge(notifications::router())
        .merge(podcasts::router())
        .merge(polls::router())
        .merge(post_engagement::router())
        .merge(referrals::router())
        .merge(scheduled_posts::router())
        .merge(stripe::router())
        .merge(subscriptions::router())
        .merge(uploads::router())
        .merge(users::router())
        .merge(webhooks::router())
        .merge(welcome_messages::router())
        .merge(withdrawals::router())
}
