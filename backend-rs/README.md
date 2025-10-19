# Fundify Rust Backend 🚀

A high-performance crowdfunding and creator monetization platform built with Rust, Axum, and PostgreSQL.

## 🎯 Features

- **Authentication**: JWT-based auth with GitHub OAuth support
- **Crowdfunding**: Campaign management, donations, and rewards  
- **Creator Economy**: Membership tiers, subscriptions, exclusive content
- **Content Management**: Posts, articles, podcasts, events
- **Monetization**: Stripe payments, digital products, referral system
- **Engagement**: Comments, likes, polls, messaging, notifications
- **Analytics**: Revenue tracking, subscriber analytics, engagement metrics

## 🏗️ Tech Stack

- **Framework**: Axum 0.7
- **Database**: PostgreSQL with SQLx
- **Payments**: Stripe (async-stripe)
- **Storage**: Supabase
- **Caching**: Redis (optional)
- **Email**: Lettre
- **Auth**: JWT with bcrypt

## 📋 Prerequisites

- Rust 1.75+
- PostgreSQL 14+
- Docker & Docker Compose (for local dev)
- Just (command runner) - \`cargo install just\`
- SQLx CLI - \`cargo install sqlx-cli --no-default-features --features postgres\`

## 🚀 Quick Start

### Option 1: Docker Compose (Easiest)

\`\`\`bash
# Start all services (Postgres, Redis, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# API available at http://localhost:8080
\`\`\`

### Option 2: Local Development

\`\`\`bash
# 1. Setup environment
cp .env.example .env

# 2. Start database with Docker
docker-compose up -d postgres redis

# 3. Run migrations
sqlx database create
sqlx migrate run

# 4. Start development server
cargo run

# Or with auto-reload
cargo watch -x run
\`\`\`

## 🛠️ Development Commands (using Just)

\`\`\`bash
just                  # List all commands
just dev              # Run with auto-reload
just test             # Run tests
just db-reset         # Reset database
just docker-up        # Start Docker services
just deploy           # Deploy to Railway
\`\`\`

## 📦 Railway Deployment

### 1. Install Railway CLI

\`\`\`bash
npm install -g @railway/cli
railway login
\`\`\`

### 2. Deploy

\`\`\`bash
# Initialize Railway project
railway init

# Add PostgreSQL
railway add postgresql

# Set required environment variables
railway variables set JWT_SECRET="your-secret-key-minimum-32-characters-long"
railway variables set STRIPE_SECRET_KEY="sk_test_YOUR_KEY"
railway variables set STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_KEY"
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET"
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Deploy
railway up

# Run migrations (after first deploy)
railway run sqlx migrate run

# View logs
railway logs

# Open dashboard
railway open
\`\`\`

Railway automatically provides:
- \`DATABASE_URL\` (from PostgreSQL addon)
- \`PORT\` (dynamically assigned)

## 🗄️ Database

Migrations are in \`migrations/\` directory.

\`\`\`bash
# Create migration
sqlx migrate add migration_name

# Run migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert

# Reset database
sqlx database drop
sqlx database create
sqlx migrate run
\`\`\`

## 🔧 Environment Variables

### Required

\`\`\`env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key-min-32-chars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

### Optional

\`\`\`env
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
\`\`\`

See [.env.example](.env.example) for full configuration.

## 📚 API Endpoints

Base URL: \`http://localhost:8080/api/v1\`

### Authentication
- \`POST /auth/register\` - Register new user
- \`POST /auth/login\` - Login
- \`GET /users/me\` - Get current user

### Campaigns
- \`GET /campaigns\` - List campaigns
- \`POST /campaigns\` - Create campaign
- \`GET /campaigns/:slug\` - Get campaign

### Donations
- \`POST /donations\` - Create donation
- \`GET /donations/my\` - Get user donations

### Subscriptions
- \`POST /subscriptions\` - Subscribe to tier
- \`GET /subscriptions/my-subscriptions\` - Get subscriptions

See Node.js backend docs for complete API reference.

## 🐛 Troubleshooting

### SQLx Compile Errors

\`\`\`bash
# Export DATABASE_URL
export DATABASE_URL="postgresql://fundify:fundify123@localhost:5432/fundify"

# Or use offline mode
export SQLX_OFFLINE=true
cargo sqlx prepare
cargo build
\`\`\`

### Database Connection Issues

\`\`\`bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
\`\`\`

### Port Already in Use

\`\`\`bash
# Change PORT in .env
PORT=8081

# Or kill process
lsof -ti:8080 | xargs kill -9
\`\`\`

## 📊 Performance

- **Binary size**: ~15MB (release)
- **Docker image**: ~100MB
- **Cold start**: <1s
- **Memory**: ~50MB idle

## 🔒 Security

- JWT authentication
- Bcrypt password hashing
- SQL injection protection (SQLx)
- CORS configuration
- Rate limiting
- Input validation

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

Built with ❤️ using Rust
