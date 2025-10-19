use std::sync::Arc;
use axum::extract::FromRef;

use crate::{
    config::AppConfig, db::DbPool, media_service::MediaService, stripe_service::StripeService,
};

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub config: Arc<AppConfig>,
    pub media: MediaService,
    pub stripe: StripeService,
}

impl AppState {
    pub fn new(
        pool: DbPool,
        config: AppConfig,
        media: MediaService,
        stripe: StripeService,
    ) -> Self {
        Self {
            pool,
            config: Arc::new(config),
            media,
            stripe,
        }
    }
}

impl FromRef<AppState> for DbPool {
    fn from_ref(input: &AppState) -> DbPool {
        input.pool.clone()
    }
}

impl FromRef<AppState> for Arc<AppConfig> {
    fn from_ref(input: &AppState) -> Arc<AppConfig> {
        input.config.clone()
    }
}

impl FromRef<AppState> for MediaService {
    fn from_ref(input: &AppState) -> MediaService {
        input.media.clone()
    }
}

impl FromRef<AppState> for StripeService {
    fn from_ref(input: &AppState) -> StripeService {
        input.stripe.clone()
    }
}
