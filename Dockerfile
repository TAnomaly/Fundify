# Railway Dockerfile - Build from backend-rs directory
# Build ID: 2025-10-19-01-17-railway-fix-v4
FROM rust:1.77-slim-bullseye AS builder

# Install dependencies
RUN apt-get update && apt-get install -y libssl-dev pkg-config

# Set working directory
WORKDIR /app

# Force cache invalidation
RUN echo "Build started at: $(date)" && echo "Build ID: 2025-10-19-01-17-railway-fix-v4"

# Copy backend-rs files
COPY backend-rs/Cargo.toml ./
COPY backend-rs/Cargo.lock ./
COPY backend-rs/src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl1.1 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built binary
COPY --from=builder /app/target/release/backend_rs ./backend_rs

# Expose port
EXPOSE 5000

# Run the application
CMD ["./backend_rs"]
