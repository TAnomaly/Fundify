# Simple Dockerfile for Railway deployment
FROM rust:1.77-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Build the application (Cargo.lock will be generated automatically)
RUN cargo build --release

# Expose port
EXPOSE 3000

# Set environment variables
ENV RUST_LOG=info
ENV PORT=3000
# Railway deployment ready - v2

# Run the application
CMD ["./target/release/backend-rs"]