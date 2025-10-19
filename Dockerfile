# Multi-stage build for Rust backend
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev pkgconfig openssl-dev

WORKDIR /app

# Copy Cargo files
COPY backend-rs/Cargo.toml backend-rs/Cargo.lock ./

# Create a dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer will be cached)
RUN cargo build --release
RUN rm -rf src

# Copy source code
COPY backend-rs/src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates openssl

# Create non-root user
RUN addgroup -g 1001 -S rust && \
    adduser -S rust -u 1001

# Copy the binary from builder stage
COPY --from=builder /app/target/release/backend_rs /usr/local/bin/backend_rs

# Change ownership
RUN chown rust:rust /usr/local/bin/backend_rs

# Switch to non-root user
USER rust

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Run the application
CMD ["backend_rs"]
