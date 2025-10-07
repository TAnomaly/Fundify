# Fundify Production Deployment Checklist

**Last Updated**: October 7, 2025
**Version**: 2.0.0
**Target Date**: Ready for Production

## 🚀 Pre-Deployment Checklist

### Backend (Railway)

#### Environment Variables
- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `JWT_SECRET` - Strong random secret (min 32 characters)
- [ ] `CORS_ORIGIN` - Frontend URL (https://funify.vercel.app)
- [ ] `FRONTEND_URL` - Same as CORS_ORIGIN
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Railway auto-assigns
- [ ] `GITHUB_CLIENT_ID` - OAuth credentials
- [ ] `GITHUB_CLIENT_SECRET` - OAuth credentials
- [ ] `GITHUB_CALLBACK_URL` - Railway backend URL + /api/auth/github/callback

#### Database
- [ ] Migrations deployed: `npx prisma migrate deploy`
- [ ] Database indexes verified
- [ ] Backup strategy configured
- [ ] Connection pooling enabled
- [ ] SSL/TLS enforced

#### Security
- [x] Rate limiting enabled
- [x] Helmet.js configured
- [x] CORS properly set
- [ ] CSRF protection (recommended)
- [x] Input validation (Zod)
- [x] Password hashing (bcrypt)
- [ ] API versioning consideration

#### Performance
- [x] Database indexes
- [ ] Response caching headers
- [ ] Gzip compression enabled
- [x] Connection pooling
- [ ] CDN for static assets

#### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic/DataDog)
- [ ] Uptime monitoring
- [ ] Log aggregation
- [ ] Alert configuration

### Frontend (Vercel)

#### Environment Variables
- [ ] `NEXT_PUBLIC_API_URL` - Railway backend URL
- [ ] `NODE_ENV` - Set to `production` (automatic)

#### Vercel Settings
- [x] Root Directory: `frontend`
- [x] Framework: Next.js
- [x] Build Command: `npm run build`
- [x] Output Directory: `.next`
- [x] Install Command: `npm install`
- [ ] Environment variables added
- [ ] Domain configured (if custom)

#### Performance
- [x] Image optimization enabled
- [x] SWC minification
- [x] Console removal in production
- [x] Bundle compression
- [ ] Analytics configured (Vercel Analytics)
- [ ] Core Web Vitals monitored

#### Security
- [ ] CSP headers configured
- [x] PoweredBy header removed
- [ ] HTTPS enforced
- [ ] Secure cookies
- [ ] XSS protection headers

## 📝 Deployment Steps

### Step 1: Backend Deployment (Railway)

1. **Connect GitHub Repository**
   ```bash
   # Railway will auto-detect the backend folder
   # Set Root Directory to: backend
   ```

2. **Configure Environment Variables**
   - Go to Railway Project > Variables
   - Add all required env vars
   - Verify Neon database URL

3. **Deploy**
   ```bash
   # Railway auto-deploys on git push
   git push origin main
   ```

4. **Run Migrations**
   ```bash
   # Railway will run this automatically if configured
   npx prisma migrate deploy
   ```

5. **Verify Deployment**
   ```bash
   curl https://your-railway-url.up.railway.app/health
   # Should return: {"status":"ok", ...}
   ```

### Step 2: Frontend Deployment (Vercel)

1. **Connect GitHub Repository**
   - Import from GitHub: TAnomaly/Fundify
   - Set Root Directory: `frontend`

2. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Add Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api
   ```

4. **Deploy**
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

5. **Verify Deployment**
   - Visit https://funify.vercel.app
   - Check browser console for errors
   - Test user registration/login
   - Test campaign creation

### Step 3: Post-Deployment Verification

#### Functional Tests
- [ ] User registration works
- [ ] Email/password login works
- [ ] OAuth login (GitHub) works
- [ ] Create campaign
- [ ] Update campaign
- [ ] Delete campaign
- [ ] Make donation
- [ ] Search campaigns
- [ ] Filter by category
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Dark mode works

#### Performance Tests
- [ ] Page load time < 3s
- [ ] Time to Interactive < 5s
- [ ] First Contentful Paint < 2s
- [ ] No console errors
- [ ] No 404s in Network tab
- [ ] Images loading properly
- [ ] API response time < 500ms

#### Security Tests
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Rate limiting works
- [ ] CORS configured correctly
- [ ] Auth tokens secure
- [ ] SQL injection protected
- [ ] XSS protection active

## 🔧 Troubleshooting

### Common Issues

#### 1. "Failed to load dashboard data"
**Solution**:
- Check backend URL in Vercel env vars
- Verify CORS settings include Vercel domain
- Check Network tab for actual error

#### 2. "Cannot reach database"
**Solution**:
- Verify DATABASE_URL is correct
- Check Neon database is running
- Verify SSL settings in connection string

#### 3. "Rate limit exceeded"
**Solution**:
- Normal behavior - wait 15 minutes
- Adjust rate limits if needed for legitimate traffic

#### 4. OAuth redirect fails
**Solution**:
- Verify callback URLs match Railway domain
- Check GitHub OAuth app settings
- Ensure frontend can receive OAuth callback

#### 5. Images not loading
**Solution**:
- Check image URLs are HTTPS
- Verify Next.js remotePatterns config
- Check CSP headers allow image domains

## 📊 Monitoring Dashboard

### Key Metrics to Monitor

#### Backend (Railway)
- Response time average: < 200ms
- Error rate: < 1%
- CPU usage: < 70%
- Memory usage: < 80%
- Database connections: < 80% of pool

#### Frontend (Vercel)
- Build time: < 2 minutes
- Bundle size: < 500KB (gzipped)
- Core Web Vitals: All Green
- 4xx errors: < 2%
- 5xx errors: < 0.1%

## 🚨 Rollback Plan

### If Deployment Fails

#### Backend
```bash
# Railway - revert to previous deployment
railway rollback
```

#### Frontend
```bash
# Vercel - go to Deployments tab
# Click "..." on previous working deployment
# Click "Promote to Production"
```

### Emergency Contacts
- Backend Issues: Railway Support
- Frontend Issues: Vercel Support
- Database Issues: Neon Support

## ✅ Post-Launch Tasks

### Week 1
- [ ] Monitor error rates daily
- [ ] Check user feedback
- [ ] Review analytics
- [ ] Performance tuning
- [ ] Fix critical bugs

### Month 1
- [ ] Security audit
- [ ] Performance review
- [ ] User metrics analysis
- [ ] Feature requests prioritization
- [ ] Documentation updates

### Ongoing
- [ ] Weekly dependency updates
- [ ] Monthly security scans
- [ ] Quarterly penetration testing
- [ ] Continuous user feedback

---

**Deployment Lead**: Your Name
**Last Deployment**: October 7, 2025
**Next Review**: November 7, 2025
