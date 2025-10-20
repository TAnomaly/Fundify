# ====================
# Multi-stage build for Fundify Rust Backend
# Railway Deploy: 2025-10-20 21:05 UTC - BINARY NAME FIX
# Build context: backend-rs/
# Binary name: backend_rs (explicit via Cargo.toml [[bin]] section)
# ====================

# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM rust:1.83-slim-bookworm as builder

# Force cache invalidation
ARG CACHEBUST=20251020-2145

# Install system dependencies for compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first for better caching
COPY backend-rs/Cargo.toml backend-rs/Cargo.lock* ./

# Create dummy src/main.rs for dependency caching
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only
RUN cargo build --release && rm -rf src

# Now copy actual source code
COPY backend-rs/src ./src
COPY backend-rs/migrations ./migrations

# Copy SQLx offline data for compile-time query checking (no DB connection needed)
COPY backend-rs/.sqlx ./.sqlx

# Build the actual application with SQLx offline mode
# This avoids connecting to database during build (migrations run at startup instead)
ENV SQLX_OFFLINE=true

RUN cargo build --release && \
    echo "========================================" && \
    echo "BUILD COMPLETED - Listing ALL files in target/release:" && \
    echo "========================================" && \
    ls -lah /app/target/release/ && \
    echo "========================================" && \
    echo "Looking for executables:" && \
    find /app/target/release -maxdepth 1 -type f -executable && \
    echo "========================================"

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

# Copy binary from builder (Rust converts hyphens to underscores in binary names)
# The binary should be named backend_rs based on Cargo.toml [[bin]] section
COPY --from=builder /app/target/release/backend_rs /usr/local/bin/backend-rs

# Copy migrations for runtime database setup
COPY --from=builder /app/migrations /app/migrations

# Set proper permissions and verify binary exists
RUN chown -R appuser:appuser /app && \
    chmod +x /usr/local/bin/backend-rs && \
    ls -la /usr/local/bin/backend-rs && \
    echo "Binary successfully copied and verified"

# Switch to non-root user
USER appuser

# Expose application port (Railway will override with PORT env)
EXPOSE 8080

# Default environment variables (Railway will override)
ENV RUST_LOG=info \
    HOST=0.0.0.0 \
    PORT=8080

# Run the application directly (no shell wrapper)
CMD ["/usr/local/bin/backend-rs"]
