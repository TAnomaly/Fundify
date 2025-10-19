use fundify_backend_rs::{
    config::AppConfig,
    db::init_pool,
    state::AppState,
    media_service::MediaService,
    stripe_service::StripeService,
};
use axum::{
    body::Body,
    http::{Request, StatusCode},
    Router,
};
use tower::ServiceExt;

#[tokio::test]
async fn test_health_endpoint() {
    let app = create_test_app().await;
    
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_auth_endpoints() {
    let app = create_test_app().await;
    
    // Test registration endpoint
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/auth/register")
                .method("POST")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"email":"test@example.com","password":"password123","name":"Test User"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should return 200 or 400 (depending on if user exists)
    assert!(response.status() == StatusCode::OK || response.status() == StatusCode::BAD_REQUEST);
}

async fn create_test_app() -> Router {
    // Create test configuration
    let config = AppConfig {
        database_url: "postgresql://test:test@localhost:5432/test".to_string(),
        frontend_url: "http://localhost:3000".to_string(),
        jwt_secret: "test-secret".to_string(),
        stripe_secret_key: "sk_test_".to_string(),
        stripe_publishable_key: "pk_test_".to_string(),
        stripe_webhook_secret: "whsec_".to_string(),
        redis_url: None,
        cloudinary_cloud_name: None,
        cloudinary_api_key: None,
        cloudinary_api_secret: None,
        github_client_id: None,
        github_client_secret: None,
        supabase_url: None,
        supabase_anon_key: None,
        supabase_service_role_key: None,
        cloud_amqp: None,
        port: 5000,
    };

    // Create test database pool (this would need a test database)
    let pool = init_pool(&config).await.unwrap();
    
    // Create services
    let media_service = MediaService::new(&config).unwrap();
    let stripe_service = StripeService::new(
        config.stripe_secret_key.clone(),
        config.stripe_publishable_key.clone(),
        config.stripe_webhook_secret.clone(),
        config.frontend_url.clone(),
    );
    
    // Create app state
    let state = AppState::new(pool, config, media_service, stripe_service);
    
    // Create router
    fundify_backend_rs::routes::api_router()
}
