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

# Copy Cargo.toml only (let Cargo.lock be generated)
COPY Cargo.toml ./

# Copy the actual source code
COPY src ./src

# Build the application (Cargo will resolve dependencies)
RUN cargo build --release

# Expose port
EXPOSE 4000

# Run the application
CMD ["./target/release/funify-backend"]