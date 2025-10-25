use axum::ServiceExt;
use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, Method, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::{auth::verify_jwt, config::Config, database::Database};

pub async fn auth_middleware(mut request: Request, next: Next) -> Result<Response, StatusCode> {
    let path = request.uri().path();
    let method = request.method().clone();
    let method_str = method.to_string();

    println!("🔐 Auth middleware: {} {}", method_str, path);

    // Skip auth for certain paths
    let is_public_route = path.starts_with("/health")
        || path.starts_with("/api/auth")
        || path.starts_with("/api/creators")
        || (path.starts_with("/api/campaigns") && method == Method::GET)
        || (path.starts_with("/api/events") && method == Method::GET)
        || (path.starts_with("/api/posts") && method == Method::GET)
        || (path.starts_with("/api/products") && method == Method::GET)
        || (path.starts_with("/api/articles") && method == Method::GET)
        || (path.starts_with("/api/podcasts") && method == Method::GET)
        || (path.starts_with("/api/notifications") && method == Method::GET)
        || (path.starts_with("/api/subscriptions") && method == Method::GET)
        || (path.starts_with("/api/") && method == Method::OPTIONS);

    if is_public_route {
        println!("✅ Skipping auth for: {}", path);
        return Ok(next.run(request).await);
    }

    println!("🔑 Authentication required for: {}", path);

    // Extract token from Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .ok_or_else(|| {
            println!("❌ No Authorization header found");
            StatusCode::UNAUTHORIZED
        })?;

    println!("📝 Authorization header: {}", auth_header);

    if !auth_header.starts_with("Bearer ") {
        println!("❌ Invalid Bearer token format");
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..]; // Remove "Bearer " prefix
    println!("🎫 Token: {}", token);

    // Load config to get JWT secret
    let config = Config::from_env().map_err(|_| {
        println!("❌ Failed to load config");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Verify JWT token
    let claims = verify_jwt(token, &config.jwt_secret).map_err(|e| {
        println!("❌ JWT verification failed: {}", e);
        StatusCode::UNAUTHORIZED
    })?;

    println!("✅ JWT verified for user: {}", claims.sub);

    // Add user ID to request extensions
    request.extensions_mut().insert(claims);

    Ok(next.run(request).await)
}

pub mod auth {
    use axum::{
        extract::{FromRequestParts, State},
        http::{request::Parts, StatusCode},
    };

    use crate::{auth::Claims, database::Database};

    #[axum::async_trait]
    impl<S> FromRequestParts<S> for Claims
    where
        S: Send + Sync,
    {
        type Rejection = StatusCode;

        async fn from_request_parts(
            parts: &mut Parts,
            _state: &S,
        ) -> Result<Self, Self::Rejection> {
            parts
                .extensions
                .get::<Claims>()
                .cloned()
                .ok_or(StatusCode::UNAUTHORIZED)
        }
    }
}
