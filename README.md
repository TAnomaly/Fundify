# 🚀 Fundify - Professional Crowdfunding Platform

Modern, scalable, and feature-rich crowdfunding platform built with cutting-edge technologies. Inspired by industry leaders like Kickstarter, Patreon, and GoFundMe.

<!-- Trigger deployment - Railway build trigger -->

![Tech Stack](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)
- [Development](#-development)
- [Deployment](#-deployment)

---

## ✨ Features

### 🎯 Core Features
- **Campaign Management**: Create, edit, and manage crowdfunding campaigns
- **User Authentication**: JWT-based auth with optional OAuth2 (Google, Facebook)
- **Donation Processing**: Secure payment handling with Stripe integration
- **Real-time Updates**: Live campaign statistics and notifications
- **Search & Filtering**: Advanced search with multiple filters and sorting
- **Responsive Design**: Beautiful UI that works on all devices

### 🚀 Advanced Features (Inspired by Competitors)
- **Reward Tiers**: Kickstarter-style backer rewards
- **Recurring Donations**: Patreon-style monthly contributions
- **Milestone System**: Track campaign progress with intermediate goals
- **Social Sharing**: Built-in sharing for Facebook, Twitter, WhatsApp
- **Comments & Community**: Engage with backers through comments
- **Campaign Updates**: Regular updates from campaign creators
- **Analytics Dashboard**: Comprehensive metrics and insights
- **Admin Panel**: Manage users, campaigns, and withdrawals

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.x | React framework with App Router |
| **TypeScript** | 5.7 | Type-safe development |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Shadcn/ui** | - | Beautiful UI components |
| **React Query** | 5.x | Server state management |
| **Zustand** | 5.x | Client state management |
| **Framer Motion** | 11.x | Smooth animations |
| **Axios** | 1.7 | HTTP client |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22.x | JavaScript runtime |
| **Express** | 4.x | Web framework |
| **TypeScript** | 5.7 | Type-safe development |
| **Prisma** | 5.x | ORM for PostgreSQL |
| **PostgreSQL** | 16.x | Primary database |
| **Redis** | 7.x | Caching & sessions |
| **JWT** | - | Authentication |
| **Zod** | 3.x | Schema validation |

### Infrastructure
- **Docker** & **Docker Compose**: Containerization
- **Adminer**: Database management GUI
- **Nodemon**: Hot reload for development

---

## 🏗️ Architecture

```
fundify/
├── frontend/              # Next.js Application
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities & API client
│   └── public/          # Static assets
│
├── backend/              # Node.js API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth & validation
│   │   ├── utils/       # Helper functions
│   │   └── types/       # TypeScript types
│   └── prisma/          # Database schema
│
└── ARCHITECTURE.md       # Detailed architecture docs
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 22+ ([Download](https://nodejs.org/))
- **Docker** ([Download](https://www.docker.com/))
- **npm** or **yarn**

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd fundify
```

2. **Start PostgreSQL & Redis**
```bash
cd backend
docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

4. **Setup Frontend** (in new terminal)
```bash
cd frontend
npm install
npm run dev
```

5. **Access the application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Database GUI**: http://localhost:8081 (Adminer)
  - System: PostgreSQL
  - Server: postgres
  - Username: fundify
  - Password: fundify123
  - Database: fundify

---

## 📁 Project Structure

### Frontend Structure
```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with navigation
│   ├── page.tsx             # Landing page
│   ├── campaigns/
│   │   ├── page.tsx         # Campaign list
│   │   └── [slug]/          # Campaign detail
│   └── globals.css          # Global styles
│
├── components/
│   └── ui/                  # Reusable UI components
│       ├── button.tsx
│       └── card.tsx
│
└── lib/
    ├── api.ts               # API client
    ├── types.ts             # TypeScript types
    └── utils.ts             # Helper functions
```

### Backend Structure
```
backend/
├── src/
│   ├── index.ts             # Express app entry
│   ├── routes/              # API route definitions
│   │   ├── auth.ts          # /api/auth
│   │   ├── campaigns.ts     # /api/campaigns
│   │   ├── donations.ts     # /api/donations
│   │   ├── users.ts         # /api/users
│   │   ├── comments.ts      # /api/comments
│   │   └── withdrawals.ts   # /api/withdrawals
│   │
│   ├── controllers/         # Business logic
│   ├── middleware/          # Auth & validation
│   └── utils/               # Utilities
│
└── prisma/
    └── schema.prisma        # Database schema
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication Endpoints
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # Login user
GET    /api/auth/me             # Get current user
```

### Campaign Endpoints
```
GET    /api/campaigns           # List campaigns (with filters)
GET    /api/campaigns/:slug     # Get campaign details
POST   /api/campaigns           # Create campaign (auth required)
PUT    /api/campaigns/:id       # Update campaign (auth required)
DELETE /api/campaigns/:id       # Delete campaign (auth required)
```

### Donation Endpoints
```
POST   /api/donations           # Create donation
GET    /api/donations/:id       # Get donation details
GET    /api/donations/campaign/:id  # List campaign donations
```

### User Endpoints
```
GET    /api/users/:id           # Get user profile
PUT    /api/users/:id           # Update profile (auth required)
GET    /api/users/:id/campaigns # List user campaigns
```

### Example Request
```bash
# Register a new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'

# Create a campaign
curl -X POST http://localhost:4000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My Awesome Project",
    "description": "Help us build something amazing!",
    "goalAmount": 10000,
    "category": "TECHNOLOGY"
  }'
```

---

## 🗄️ Database Schema

### Key Tables

**Users**
- Authentication and profile information
- Roles: user, admin, moderator

**Campaigns**
- Title, description, story
- Goal amount and current amount
- Status: draft, active, completed, cancelled
- Funding model: all-or-nothing, flexible, recurring

**Donations**
- Amount and currency
- Anonymous option
- Recurring donations support
- Payment status tracking

**Rewards**
- Campaign reward tiers
- Delivery dates
- Backer limits

**Comments**
- Nested replies support
- Campaign engagement

**Withdrawals**
- Fund withdrawal requests
- Admin approval workflow

For detailed schema, see [prisma/schema.prisma](backend/prisma/schema.prisma)

---

## 🎨 Screenshots

### Landing Page
Modern hero section with gradient backgrounds, feature highlights, and trending campaigns.

### Campaign List
Advanced filtering by category, search, and sorting options with beautiful card layouts.

### Campaign Detail
Comprehensive campaign page with tabs for story, updates, and comments. Sticky donation sidebar.

### Dashboard
User dashboard showing created campaigns, donations made, and analytics.

---

## 💻 Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Management
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Create migration
npx prisma migrate dev --name migration_name
```

### Building for Production
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

---

## 🚀 Deployment

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=4000
NODE_ENV="production"
CORS_ORIGIN="https://your-frontend-domain.com"
STRIPE_SECRET_KEY="sk_live_..."
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL="https://api.your-domain.com"
```

### Deployment Platforms

- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Render, DigitalOcean
- **Database**: Supabase, Neon, Railway

---

## 📄 License

MIT License - feel free to use for personal or commercial projects!

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For questions or support:
- Create an issue on GitHub
- Email: support@fundify.com

---

## 🌟 Acknowledgments

Inspired by:
- **Kickstarter** - All-or-nothing funding model
- **Patreon** - Recurring donation support
- **GoFundMe** - Flexible funding and social features

Built with ❤️ using modern web technologies

---

**⭐ Star this repo if you find it useful!**
