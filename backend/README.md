# Funify Backend

Rust-Axum backend for the Funify platform.

## Features

- GitHub OAuth authentication
- User management
- Posts and content management
- Digital products and e-commerce
- Stripe payment integration
- Redis caching
- PostgreSQL database
- CloudAMQP message queue

## Environment Variables

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret
- `GITHUB_CALLBACK_URL`: GitHub OAuth callback URL

## Development

1. Install Rust: https://rustup.rs/
2. Install PostgreSQL and Redis
3. Set up environment variables
4. Run the server:

```bash
cargo run
```

## API Endpoints

### Authentication
- `GET /api/auth/github` - Start GitHub OAuth flow
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Posts
- `GET /api/posts` - Get posts (with pagination)
- `POST /api/posts` - Create a new post
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Products
- `GET /api/products` - Get products (with pagination)
- `POST /api/products` - Create a new product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Docker

```bash
docker build -t funify-backend .
docker run -p 4000:4000 --env-file .env funify-backend
```

## Database Schema

The application automatically creates the following tables:
- `users` - User accounts
- `posts` - User posts and content
- `products` - Digital products for sale
- `subscriptions` - User subscriptions to creators
- `purchases` - Product purchase records
