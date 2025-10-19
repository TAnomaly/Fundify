# Fundify Rust Backend Makefile

.PHONY: help build run test clean docker-build docker-run migrate dev

# Default target
help:
	@echo "Fundify Rust Backend - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Run in development mode with hot reload"
	@echo "  build        - Build the project"
	@echo "  run          - Run the application"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"
	@echo ""
	@echo "Database:"
	@echo "  migrate      - Run database migrations"
	@echo "  migrate-reset - Reset and run all migrations"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run with Docker Compose"
	@echo "  docker-stop  - Stop Docker containers"
	@echo ""
	@echo "Utilities:"
	@echo "  check        - Check if code compiles"
	@echo "  fmt          - Format code"
	@echo "  clippy       - Run clippy linter"

# Development
dev:
	@echo "Starting development server..."
	cargo run

build:
	@echo "Building project..."
	cargo build --release

run:
	@echo "Running application..."
	cargo run --release

test:
	@echo "Running tests..."
	cargo test

clean:
	@echo "Cleaning build artifacts..."
	cargo clean

# Database
migrate:
	@echo "Running database migrations..."
	./scripts/migrate.sh

migrate-reset:
	@echo "Resetting database and running migrations..."
	@echo "WARNING: This will drop all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	psql $(DATABASE_URL) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	./scripts/migrate.sh

# Docker
docker-build:
	@echo "Building Docker image..."
	docker build -t fundify-backend-rs .

docker-run:
	@echo "Starting services with Docker Compose..."
	docker-compose up -d

docker-stop:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

# Utilities
check:
	@echo "Checking if code compiles..."
	cargo check

fmt:
	@echo "Formatting code..."
	cargo fmt

clippy:
	@echo "Running clippy linter..."
	cargo clippy -- -D warnings

# Setup
setup:
	@echo "Setting up development environment..."
	@if [ ! -f .env ]; then \
		echo "Creating .env file from example..."; \
		cp env.example .env; \
		echo "Please edit .env file with your configuration"; \
	fi
	@echo "Installing dependencies..."
	cargo build
	@echo "Setup complete!"

# Production
deploy:
	@echo "Deploying to production..."
	@echo "This would typically involve:"
	@echo "1. Building the Docker image"
	@echo "2. Pushing to container registry"
	@echo "3. Deploying to your cloud provider"
	@echo "Please implement your deployment strategy"
