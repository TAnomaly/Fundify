# Simple Dockerfile for Railway deployment (fixed)
FROM rustlang/rust:nightly-slim as builder


RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN cargo build --release

EXPOSE 3000
ENV RUST_LOG=info
ENV PORT=3000

CMD ["./target/release/backend-rs"]
