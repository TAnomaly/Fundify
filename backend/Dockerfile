# Use latest stable Rust
FROM rust:slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy the actual source code
COPY src ./src

# Build the application (Cargo will resolve dependencies)
RUN cargo build --release

# Verify binary was built and make executable
RUN ls -lh target/release/funify-backend && \
    chmod +x target/release/funify-backend

# Expose port
EXPOSE 4000

# Run the application
CMD ["./target/release/funify-backend"]