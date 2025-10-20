# ====================
# Multi-stage build for Fundify Rust Backend
# Railway Deploy: 2025-10-20 - Optimized with stable base images
# ====================

# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM rust:1.83-slim-bookworm as builder

# Install system dependencies for compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Force cache bust for cargo registry - 2025-10-20-13-PORT-FIX
RUN echo "Cache bust: 2025-10-20-13-PORT-FIX" > /tmp/cache-bust

# Copy dependency manifests first for better caching
COPY backend-rs/Cargo.toml ./

# Create dummy src/main.rs (needed for cargo generate-lockfile to work)
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Clear cargo cache and update index to ensure clean dependency resolution
RUN rm -rf /usr/local/cargo/registry/cache/* \
    && rm -rf /usr/local/cargo/registry/src/* \
    && cargo update --dry-run

# Regenerate Cargo.lock with Rust 1.75 (version 3 format)
RUN cargo generate-lockfile

# Build dependencies and clean up dummy source
RUN cargo build --release && rm -rf src

# Now copy actual source code
COPY backend-rs/src ./src
COPY backend-rs/migrations ./migrations
COPY backend-rs/.sqlx ./.sqlx

# Build the actual application with offline SQLx
# This requires .sqlx/ directory for query caching
ENV SQLX_OFFLINE=true
RUN cargo build --release

# -----------------------------
# Stage 2: Runtime
# -----------------------------
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    libpq5 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN useradd -r -u 1001 -s /bin/false appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/backend-rs /usr/local/bin/backend-rs

# Copy migrations for runtime database setup
COPY --from=builder /app/migrations /app/migrations

# Set proper permissions
RUN chown -R appuser:appuser /app && \
    chmod +x /usr/local/bin/backend-rs

# Switch to non-root user
USER appuser

# Expose application port (Railway will override with PORT env)
EXPOSE 8080

# Default environment variables (Railway will override)
ENV RUST_LOG=debug \
    HOST=0.0.0.0 \
    PORT=8080

# Health check - disabled temporarily for Railway debugging
# HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#     CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the application with explicit error output
CMD ["/usr/local/bin/backend-rs"]
