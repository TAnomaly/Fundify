# Fundify - Professional Crowdfunding Platform
## Modern Bağış ve Kitlesel Fonlama Platformu

### 🎯 Platform Özellikleri (Rakip Analizi Sonrası)

#### ✅ Temel Özellikler
- **Kampanya Yönetimi**: Hedef bazlı ve esnek fonlama modelleri
- **Kullanıcı Profilleri**: Bağışçı ve kampanya sahibi profilleri
- **Ödeme Entegrasyonu**: Stripe, PayPal, Iyzico
- **Sosyal Paylaşım**: Facebook, Twitter, WhatsApp entegrasyonu
- **Gerçek Zamanlı Güncellemeler**: WebSocket ile canlı bildirimler
- **Analitik Dashboard**: Kampanya performans metrikleri

#### 🚀 Gelişmiş Özellikler (Rakiplerden İlham Alınarak)
- **Recurring Donations**: Patreon tarzı aylık bağışlar
- **Milestone System**: Ara hedefler ve ödüller
- **Reward Tiers**: Kickstarter tarzı bağış seviyeleri
- **Social Proof**: Canlı bağış bildirimleri ve kampanya popülerliği
- **Campaign Updates**: Kampanya sahiplerinin düzenli güncellemeleri
- **Comments & Community**: Bağışçı yorumları ve topluluk
- **Multi-Currency**: Çoklu para birimi desteği
- **Tax Receipts**: Otomatik bağış makbuzu
- **Email Campaigns**: Otomatik e-posta kampanyaları
- **Withdrawal Management**: Fon çekme istekleri ve onayları

---

## 🏗️ Teknoloji Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **API Client**: TanStack Query (React Query)
- **Charts**: Recharts
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js 22
- **Framework**: Express.js / Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Authentication**: JWT + OAuth2 (Google, Facebook)
- **File Storage**: AWS S3 / MinIO
- **Email**: Nodemailer + SendGrid
- **Cache**: Redis
- **Queue**: Bull (Redis-based)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Playwright
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

---

## 📊 Database Schema (PostgreSQL)

### Core Tables

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  full_name VARCHAR NOT NULL,
  avatar_url VARCHAR,
  bio TEXT,
  role ENUM('user', 'admin', 'moderator'),
  oauth_provider VARCHAR,
  oauth_id VARCHAR,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Campaigns
campaigns (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE,
  description TEXT,
  story TEXT,
  category VARCHAR(50),
  goal_amount DECIMAL(12,2),
  current_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'TRY',
  funding_model ENUM('all_or_nothing', 'flexible', 'recurring'),
  status ENUM('draft', 'active', 'completed', 'cancelled'),
  featured BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  image_url VARCHAR,
  video_url VARCHAR,
  country VARCHAR(2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Donations
donations (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID REFERENCES users(id) NULL,
  donor_name VARCHAR(100),
  donor_email VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3),
  tip_amount DECIMAL(12,2) DEFAULT 0,
  message TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency ENUM('monthly', 'yearly') NULL,
  payment_status ENUM('pending', 'completed', 'failed', 'refunded'),
  payment_provider VARCHAR(50),
  payment_id VARCHAR,
  reward_tier_id UUID REFERENCES reward_tiers(id) NULL,
  created_at TIMESTAMP
)

-- Reward Tiers (Kickstarter-style)
reward_tiers (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  delivery_date DATE,
  backers_limit INT,
  backers_count INT DEFAULT 0,
  created_at TIMESTAMP
)

-- Campaign Updates
campaign_updates (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  title VARCHAR(200),
  content TEXT NOT NULL,
  created_at TIMESTAMP
)

-- Comments
comments (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID REFERENCES users(id),
  parent_id UUID REFERENCES comments(id) NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Withdrawals
withdrawals (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(12,2),
  status ENUM('pending', 'approved', 'rejected', 'completed'),
  bank_account_info JSONB,
  requested_at TIMESTAMP,
  processed_at TIMESTAMP
)

-- Analytics
campaign_views (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer VARCHAR,
  created_at TIMESTAMP
)
```

---

## 🎨 Project Structure

```
fundify/
├── frontend/              # Next.js 15 Application
│   ├── app/              # App Router
│   │   ├── (auth)/       # Auth routes
│   │   ├── (dashboard)/  # Dashboard routes
│   │   ├── campaigns/    # Campaign pages
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── ui/          # Shadcn components
│   │   ├── campaigns/   # Campaign components
│   │   └── shared/      # Shared components
│   ├── lib/             # Utilities
│   ├── hooks/           # Custom hooks
│   └── store/           # Zustand stores
│
├── backend/              # Node.js API
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Request handlers
│   │   ├── services/    # Business logic
│   │   ├── models/      # Prisma models
│   │   ├── middleware/  # Express middleware
│   │   ├── utils/       # Utilities
│   │   └── config/      # Configuration
│   ├── prisma/          # Database schema
│   └── tests/           # Tests
│
├── docker/              # Docker configs
├── docs/                # Documentation
└── scripts/             # Utility scripts
```

---

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- OAuth2 integration (Google, Facebook, Twitter)
- Rate limiting on API endpoints
- CSRF protection
- SQL injection prevention (Prisma ORM)
- XSS protection
- Secure payment handling (PCI-DSS compliant)
- Email verification
- Two-factor authentication (optional)

---

## 💳 Payment Integration

### Supported Providers
- **Stripe**: International payments
- **Iyzico**: Turkish local payments
- **PayPal**: Alternative payment method

### Payment Features
- One-time donations
- Recurring subscriptions
- Platform fee (2.5% + payment processor fees)
- Optional donor tip
- Automatic refunds
- Payout automation

---

## 📱 API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET /api/auth/me
- POST /api/auth/verify-email
- POST /api/auth/forgot-password

### Campaigns
- GET /api/campaigns (list with filters)
- GET /api/campaigns/:slug
- POST /api/campaigns (create)
- PUT /api/campaigns/:id (update)
- DELETE /api/campaigns/:id
- GET /api/campaigns/:id/donations
- GET /api/campaigns/:id/updates
- POST /api/campaigns/:id/updates
- GET /api/campaigns/:id/analytics

### Donations
- POST /api/donations (create)
- GET /api/donations/:id
- POST /api/donations/:id/refund

### Users
- GET /api/users/:id
- PUT /api/users/:id
- GET /api/users/:id/campaigns
- GET /api/users/:id/donations

---

## 🚀 Performance Optimizations

- Server-side rendering (Next.js)
- Image optimization (Next.js Image)
- Database query optimization (indexes)
- Redis caching for frequently accessed data
- CDN for static assets
- Connection pooling
- Lazy loading
- Code splitting

---

## 📈 Analytics & Metrics

- Campaign view tracking
- Conversion rate
- Average donation amount
- Geographic distribution
- Traffic sources
- User retention
- Payment success rate
- Platform revenue

---

## 🌍 Internationalization (i18n)

- Multi-language support (TR, EN, DE, FR)
- RTL support for Arabic
- Multi-currency display
- Localized date/time formats
- Country-specific payment methods

---

## 🎯 MVP Features (Phase 1)

1. ✅ User authentication & profiles
2. ✅ Campaign creation & management
3. ✅ Donation processing (Stripe)
4. ✅ Campaign search & filtering
5. ✅ Basic dashboard
6. ✅ Email notifications
7. ✅ Social sharing

## Future Features (Phase 2+)

- Mobile apps (React Native)
- AI-powered campaign suggestions
- Blockchain-based transparency
- NFT rewards
- Live streaming for campaigns
- Gamification & badges
- Ambassador program
- API for third-party integrations

---

**Built with ❤️ using modern technologies**
