# Fundify Backend API

A complete Node.js + Express + PostgreSQL + Prisma backend for the Fundify crowdfunding platform.

## Features

- RESTful API with Express.js
- PostgreSQL database with Prisma ORM
- JWT authentication and authorization
- Input validation with Zod
- Rate limiting and security with Helmet
- CORS configuration
- TypeScript for type safety
- Docker Compose for development environment

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose (for database)
- Git

### Installation

1. Clone the repository and navigate to backend:
```bash
cd /home/tugmirk/Desktop/fundify/backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

5. Start Docker services (PostgreSQL + Redis):
```bash
docker-compose up -d
```

6. Generate Prisma Client:
```bash
npm run prisma:generate
```

7. Run database migrations:
```bash
npm run prisma:migrate
```

8. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Campaign Endpoints

- `GET /api/campaigns` - Get all campaigns (with filters)
- `GET /api/campaigns/:slug` - Get campaign by slug
- `POST /api/campaigns` - Create campaign (protected)
- `PUT /api/campaigns/:id` - Update campaign (protected)
- `DELETE /api/campaigns/:id` - Delete campaign (protected)
- `GET /api/campaigns/my` - Get user's campaigns (protected)

### Donation Endpoints

- `POST /api/donations` - Create donation (protected)
- `GET /api/donations/my` - Get user's donations (protected)
- `GET /api/donations/:id` - Get donation by ID (protected)
- `GET /api/donations/campaign/:campaignId` - Get campaign donations

### User Endpoints

- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update user profile (protected)
- `GET /api/users/:id/campaigns` - Get user's campaigns

### Comment Endpoints

- `POST /api/comments` - Create comment (protected)
- `GET /api/comments/campaign/:campaignId` - Get campaign comments
- `PUT /api/comments/:id` - Update comment (protected)
- `DELETE /api/comments/:id` - Delete comment (protected)

### Withdrawal Endpoints

- `POST /api/withdrawals` - Request withdrawal (protected)
- `GET /api/withdrawals/my` - Get user's withdrawals (protected)
- `GET /api/withdrawals` - Get all withdrawals (admin only)
- `PUT /api/withdrawals/:id` - Update withdrawal status (admin only)

## Database Schema

The database includes the following models:

- **User**: User accounts with authentication
- **Campaign**: Crowdfunding campaigns
- **Donation**: User donations to campaigns
- **Reward**: Campaign rewards for backers
- **Comment**: Campaign comments and replies
- **CampaignUpdate**: Updates posted by campaign creators
- **Withdrawal**: Withdrawal requests from campaign creators

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Environment Variables

See `.env.example` for all available environment variables.

## Database Management

Access Adminer (database GUI) at `http://localhost:8080` when Docker is running.

Credentials:
- System: PostgreSQL
- Server: postgres
- Username: fundify
- Password: fundify123
- Database: fundify

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet for security headers
- CORS configuration
- Input validation with Zod
- SQL injection protection via Prisma

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Express middleware
│   ├── routes/                # API routes
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utility functions
│   └── index.ts               # Express app entry point
├── docker-compose.yml         # Docker services
├── package.json
├── tsconfig.json
└── .env.example
```

## License

MIT
