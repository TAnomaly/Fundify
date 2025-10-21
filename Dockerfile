# Build stage
FROM rust:1.85-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust backend files
COPY backend-rs/Cargo.toml backend-rs/Cargo.lock ./
COPY backend-rs/src ./src

# Build dependencies (cached layer)
RUN mkdir -p temp && \
    echo "fn main() {}" > temp/main.rs && \
    mv src src_backup && \
    mv temp src && \
    cargo build --release && \
    rm -rf src && \
    mv src_backup src

# Build application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/fundify-backend /app/fundify-backend

# Set environment
ENV RUST_LOG=info
ENV PORT=4000

# Expose port
EXPOSE 4000

# Run the application
CMD ["./fundify-backend"]