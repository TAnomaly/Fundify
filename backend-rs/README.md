# Fundify Backend (Rust)

A high-performance backend for the Fundify platform built with Rust and Axum.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access
- **User Management**: Registration, profiles, creator features
- **Campaign Management**: Create, manage, and track fundraising campaigns
- **Digital Products**: Sell and manage digital products
- **Events**: Create and manage events
- **Articles**: Content management system
- **Podcasts**: Audio content management
- **Donations**: Payment processing and tracking
- **Subscriptions**: Recurring payment management
- **Analytics**: Comprehensive analytics and reporting
- **Notifications**: Real-time notification system
- **File Uploads**: Secure file upload and management
- **Comments**: Interactive commenting system
- **Feed**: Social media-like feed
- **Polls**: Interactive polling system
- **Goals**: Goal setting and tracking
- **Messages**: Direct messaging system
- **Referrals**: Referral system with rewards
- **Scheduled Posts**: Content scheduling
- **Stripe Integration**: Payment processing
- **Webhooks**: Event handling

## Tech Stack

- **Framework**: Axum (Rust)
- **Database**: PostgreSQL with SQLx
- **Authentication**: JWT
- **File Storage**: Local/Cloud storage
- **Payments**: Stripe integration
- **Deployment**: Railway

## Quick Start

### Prerequisites

- Rust 1.75+
- PostgreSQL 13+
- Cargo

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cargo build
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/fundify"
   sqlx database create
   sqlx migrate run
   cargo sqlx prepare
   ```

5. Run the application:
   ```bash
   cargo run
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/users/me` - Get current user

### Campaigns
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns/:id` - Get campaign
- `PUT /api/v1/campaigns/:id` - Update campaign
- `DELETE /api/v1/campaigns/:id` - Delete campaign

### Digital Products
- `GET /api/v1/digital-products` - List products
- `POST /api/v1/digital-products` - Create product
- `GET /api/v1/digital-products/:id` - Get product
- `PUT /api/v1/digital-products/:id` - Update product
- `DELETE /api/v1/digital-products/:id` - Delete product

### Events
- `GET /api/v1/events` - List events
- `POST /api/v1/events` - Create event
- `GET /api/v1/events/:id` - Get event
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

### Articles
- `GET /api/v1/articles` - List articles
- `POST /api/v1/articles` - Create article
- `GET /api/v1/articles/:slug` - Get article
- `PUT /api/v1/articles/:slug` - Update article
- `DELETE /api/v1/articles/:slug` - Delete article

### And many more...

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts
- `campaigns` - Fundraising campaigns
- `digital_products` - Digital products for sale
- `events` - Events and meetups
- `articles` - Blog articles
- `podcasts` - Audio content
- `donations` - Donation records
- `subscriptions` - Subscription management
- `comments` - Comment system
- `notifications` - User notifications
- `uploads` - File uploads
- `goals` - Goal tracking
- `messages` - Direct messages
- `referral_codes` - Referral system
- `scheduled_posts` - Content scheduling

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Docker

```bash
docker build -t fundify-backend .
docker run -p 3000:3000 fundify-backend
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRATION` - JWT expiration time
- `PORT` - Server port (default: 3000)
- `RUST_LOG` - Log level
- `CORS_ORIGIN` - CORS allowed origins
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License