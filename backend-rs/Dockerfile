# ====================
# Multi-stage build for Fundify Rust Backend
# Railway Deploy: 2025-10-20 - Force cache clear
# ====================

# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM rust:1.75-slim as builder

# Install system dependencies for compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Force cache bust for cargo registry - 2025-10-20-03
RUN echo "Cache bust: 2025-10-20-03" > /tmp/cache-bust

# Copy dependency manifests first for better caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Now copy actual source code
COPY src ./src
COPY migrations ./migrations

# Build the actual application with offline SQLx
# This requires sqlx-data.json for query caching
ENV SQLX_OFFLINE=true
RUN cargo build --release

# -----------------------------
# Stage 2: Runtime
# -----------------------------
FROM debian:bookworm-slim

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

# Default environment variables
ENV RUST_LOG=info \
    HOST=0.0.0.0 \
    PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the application
CMD ["backend-rs"]
