# Fundify Project Rules & Guidelines

## 📋 Project Overview
**Fundify** - Modern crowdfunding platform with Next.js frontend and Express.js backend

## 🎨 Design System

### Color Palette (Charity-focused)
- **Primary**: Blue (#3b82f6) - Trust, reliability
- **Secondary**: Teal (#14b8a6) - Growth, development
- **Accent**: Emerald (#10b981) - Hope, positive change
- **Warm Accent**: Orange/Coral - Warmth, generosity

### Color Variables
```css
--primary: 210 85% 58%;
--secondary: 155 60% 50%;
--accent: 25 90% 62%;
```

### Design Principles
- Soft gradients (blue → teal → emerald)
- Glass morphism effects for cards
- Soft shadows (shadow-soft, shadow-soft-hover)
- Smooth transitions (duration-300, duration-500)
- Rounded corners (rounded-xl, rounded-2xl)
- Dark mode optimized

## 🏗️ Architecture

### Frontend (Next.js 15)
**Location**: `/frontend`
- **Framework**: Next.js 15.5.4 with App Router
- **Styling**: Tailwind CSS with custom design system
- **State**: React hooks (useState, useEffect)
- **API Client**: Axios with interceptors
- **Auth**: JWT tokens (localStorage + cookies)

**Key Directories**:
```
frontend/
├── app/              # Next.js pages (App Router)
├── components/       # Reusable components
├── lib/             # Utilities, API, types
└── public/          # Static assets
```

### Backend (Express.js)
**Location**: `/backend`
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon) via Prisma ORM
- **Auth**: JWT with bcrypt
- **Validation**: Zod schemas

**Key Directories**:
```
backend/
├── src/
│   ├── controllers/  # Business logic
│   ├── routes/       # API endpoints
│   ├── middleware/   # Auth, error handling
│   ├── utils/        # Validation, helpers
│   └── types/        # TypeScript types
└── prisma/          # Database schema & migrations
```

## 🔐 Authentication Flow

1. **JWT Storage**: Both localStorage AND cookies (for middleware)
2. **Token Format**:
   ```typescript
   {
     userId: string;
     email: string;
     username: string;
     exp: number;
     iat: number;
   }
   ```
3. **Auth Endpoints**:
   - POST `/api/auth/register`
   - POST `/api/auth/login`
   - GET `/api/auth/google`
   - GET `/api/auth/github`

## 📊 Database Schema

### Key Models
- **User**: id, email, name, password, role, avatar, bio
- **Campaign**: id, title, slug, description, goalAmount, currentAmount, status (DRAFT/ACTIVE/COMPLETED), creatorId
- **Donation**: id, amount, message, anonymous, userId, campaignId
- **Comment**: Campaign comments
- **Update**: Campaign updates

### Important Fields
- Campaign uses `goalAmount` and `coverImage` (backend)
- Frontend expects `goal` and `imageUrl`
- **Always transform** backend → frontend in API responses

## 🚀 Deployment

### Frontend (Vercel)
- **URL**: https://funify.vercel.app
- **Repo**: https://github.com/TAnomaly/Fundify
- **Branch**: main
- **Root Directory**: `frontend` (CRITICAL!)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Backend (Railway)
- **API URL**: Set in NEXT_PUBLIC_API_URL
- **Database**: Neon PostgreSQL
- **Auto-deploy**: From GitHub main branch

## 🛠️ Common Issues & Solutions

### Issue: Vercel deployment fails with "package.json not found"
**Solution**: Set Root Directory to `frontend` in Vercel Settings > General > Build & Development Settings

### Issue: Dashboard shows "Failed to load dashboard data"
**Solution**: Check if `/api/users/me` endpoint exists and is placed BEFORE `/:id` route

### Issue: Campaigns not showing in Explore page
**Solution**:
1. Check campaign status (should be ACTIVE)
2. Transform backend fields: `goalAmount → goal`, `coverImage → imageUrl`
3. Handle `backers` from `_count.donations`

### Issue: Campaign deletion works but dashboard fails to reload
**Solution**: Transform campaign data in `loadDashboardData`:
```typescript
const transformedCampaigns = response.data.map((c: any) => ({
  ...c,
  goal: c.goal || c.goalAmount,
  imageUrl: c.imageUrl || c.coverImage,
  backers: c.backers || c._count?.donations || 0,
}));
```

### Issue: Old purple colors still showing after deployment
**Solution**:
1. Hard refresh (Ctrl+Shift+R)
2. Check Vercel Root Directory = `frontend`
3. Verify commit hash in Vercel Deployments
4. Clear browser cache

## 📝 Code Conventions

### Naming
- **Components**: PascalCase (e.g., `CampaignCard`)
- **Files**: kebab-case (e.g., `campaign-card.tsx`)
- **API routes**: lowercase (e.g., `/api/campaigns`)
- **Database fields**: camelCase (e.g., `goalAmount`)

### Git Commits
Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance
- `style:` - Design changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

### CSS Classes
Use Tailwind utilities + custom classes:
- `bg-gradient-primary` - Blue → Teal → Emerald gradient
- `bg-glass-card` - Glass morphism card
- `shadow-soft` - Soft shadow
- `shadow-soft-hover` - Hover shadow
- `text-gradient` - Gradient text

## 🧪 Testing Checklist

### Authentication
- [ ] Register with email/password
- [ ] Login with email/password
- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] Token persistence
- [ ] Logout functionality

### Campaigns
- [ ] Create campaign (all fields)
- [ ] View campaign details
- [ ] Edit campaign
- [ ] Delete campaign
- [ ] Search campaigns
- [ ] Filter by category
- [ ] Pagination (Load More)

### Donations
- [ ] Make donation
- [ ] Anonymous donation
- [ ] Donation message
- [ ] View donation history
- [ ] Campaign total updates correctly

### Dashboard
- [ ] Stats display correctly
- [ ] User campaigns list
- [ ] User donations list
- [ ] Delete campaign from dashboard
- [ ] Dashboard reload after actions

### UI/UX
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode works
- [ ] Animations smooth
- [ ] Loading states
- [ ] Error messages
- [ ] Success toasts

## 🔒 Security

### Required
- ✅ Environment variables for secrets
- ✅ JWT token expiration
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration
- ✅ Input validation (Zod)
- ✅ SQL injection protection (Prisma)

### To Add
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] XSS sanitization
- [ ] File upload validation
- [ ] Payment security (Stripe)

## 📈 Performance

### Frontend
- [ ] Image optimization (Next.js Image)
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Bundle size analysis
- [ ] Caching strategy

### Backend
- [ ] Database indexing
- [ ] Query optimization
- [ ] Response caching
- [ ] Connection pooling
- [ ] API pagination

## 📚 API Endpoints Reference

### Auth
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- GET `/api/auth/google` - Google OAuth
- GET `/api/auth/github` - GitHub OAuth

### Users
- GET `/api/users/me` - Get current user (MUST be before /:id)
- GET `/api/users/:id` - Get user by ID
- PUT `/api/users/:id` - Update user
- GET `/api/users/:id/campaigns` - Get user's campaigns

### Campaigns
- GET `/api/campaigns` - Get all campaigns (with filters)
- GET `/api/campaigns/:slug` - Get campaign by slug
- POST `/api/campaigns` - Create campaign (auth required)
- PUT `/api/campaigns/:id` - Update campaign (auth required)
- DELETE `/api/campaigns/:id` - Delete campaign (auth required)

### Donations
- GET `/api/donations/my` - Get user's donations (auth required)
- POST `/api/donations` - Create donation (auth required)

## 🎯 Next Steps

1. **Testing**: Comprehensive testing of all features
2. **Performance**: Optimize loading times and bundle size
3. **Security**: Add rate limiting and CSRF protection
4. **Features**: Payment integration (Stripe), email notifications
5. **Analytics**: Add tracking and analytics
6. **Documentation**: API documentation (Swagger/OpenAPI)

---

**Last Updated**: October 7, 2025
**Version**: 2.0.0
