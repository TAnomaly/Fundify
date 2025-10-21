# CORS Settings Documentation

## Overview
This document explains the CORS (Cross-Origin Resource Sharing) configuration for the Fundify project to prevent CORS issues across different environments.

## Current CORS Configuration

### Backend (Rust/Axum)
**File:** `backend-rs/src/main.rs`

#### Allowed Origins
```rust
let static_origins = vec![
    "http://localhost:3000",           // Local development
    "http://localhost:3001",           // Local development (alternative port)
    "https://funify.vercel.app",       // Production frontend
    "https://fundify.vercel.app",      // Production frontend
    "https://perfect-happiness-production.up.railway.app", // Backend self-reference
    "https://fundify-frontend.vercel.app", // Alternative frontend URL
    "https://fundify-app.vercel.app",  // Alternative frontend URL
];
```

#### Environment Variables for Origins
The system also reads from these environment variables:
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `NEXT_PUBLIC_FRONTEND_URL`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_DASHBOARD_ORIGIN`
- `ALLOWED_ORIGINS`
- `CORS_ORIGINS`

#### Wildcard Patterns
```rust
let wildcard_allowed =
    normalized.ends_with(".vercel.app") || 
    normalized.ends_with(".railway.app") ||
    normalized.ends_with(".up.railway.app");
```

#### CORS Headers Set
```rust
// Always set these headers
response.headers_mut().insert(
    "access-control-allow-credentials",
    HeaderValue::from_static("true"),
);

response.headers_mut().insert(
    "access-control-allow-methods",
    HeaderValue::from_static("GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"),
);

response.headers_mut().insert(
    "access-control-allow-headers",
    HeaderValue::from_static("Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Accept-Language, Origin, Access-Control-Request-Method, Access-Control-Request-Headers")
);

response.headers_mut().insert(
    "access-control-expose-headers",
    HeaderValue::from_static("Content-Length, Content-Type, Date, Server, Transfer-Encoding")
);
```

### Frontend Configuration
**File:** `frontend/lib/api.ts`

#### API Base URL Configuration
```typescript
export const getApiUrl = () => {
  // Production URL - Force Railway URL for production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return "https://perfect-happiness-production.up.railway.app/api";
  }

  // Development fallback
  return "http://localhost:4000/api";
};
```

## Environment-Specific CORS Settings

### Development Environment
- **Frontend:** `http://localhost:3000`
- **Backend:** `http://localhost:4000`
- **CORS:** Allows all origins in development mode

### Production Environment
- **Frontend:** `https://fundify.vercel.app`
- **Backend:** `https://perfect-happiness-production.up.railway.app`
- **CORS:** Strict origin checking with specific allowed origins

## Common CORS Issues and Solutions

### 1. "CORS header 'Access-Control-Allow-Origin' missing"
**Cause:** Backend not setting proper CORS headers
**Solution:** Ensure CORS middleware is properly configured and applied to all routes

### 2. "Cross-Origin Request Blocked"
**Cause:** Origin not in allowed list
**Solution:** Add the origin to `static_origins` array or environment variables

### 3. "NS_BINDING_ABORTED"
**Cause:** Preflight OPTIONS request failing
**Solution:** Ensure OPTIONS handlers are properly configured

### 4. 502 Bad Gateway
**Cause:** Backend not responding to OPTIONS requests
**Solution:** Add global OPTIONS handler and proper preflight handling

## Adding New Origins

### For New Frontend Domains
1. Add to `static_origins` array in `backend-rs/src/main.rs`:
```rust
let static_origins = vec![
    // ... existing origins
    "https://your-new-domain.com",
];
```

2. Or set environment variable:
```bash
export CORS_ORIGIN="https://your-new-domain.com"
```

### For New Development Environments
1. Add localhost ports to `static_origins`:
```rust
"http://localhost:3002",  // New dev port
```

2. Update frontend API configuration if needed

## Testing CORS Configuration

### 1. Test OPTIONS Request
```bash
curl -X OPTIONS \
  -H "Origin: https://fundify.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v https://perfect-happiness-production.up.railway.app/api/campaigns
```

### 2. Test GET Request
```bash
curl -H "Origin: https://fundify.vercel.app" \
  -v https://perfect-happiness-production.up.railway.app/api/campaigns
```

### 3. Check Response Headers
Look for these headers in the response:
- `access-control-allow-origin`
- `access-control-allow-credentials`
- `access-control-allow-methods`
- `access-control-allow-headers`

## Deployment Checklist

### Before Deploying
- [ ] Check all allowed origins are in `static_origins` array
- [ ] Verify environment variables are set correctly
- [ ] Test OPTIONS requests work
- [ ] Test actual API calls work
- [ ] Check browser console for CORS errors

### After Deploying
- [ ] Test frontend can make API calls
- [ ] Check browser network tab for CORS headers
- [ ] Verify no CORS errors in console
- [ ] Test authentication flows work

## Troubleshooting Guide

### If CORS Breaks After Deployment

1. **Check Railway Logs:**
```bash
# Check if backend is running
curl https://perfect-happiness-production.up.railway.app/health
```

2. **Verify CORS Headers:**
```bash
curl -I https://perfect-happiness-production.up.railway.app/api/campaigns
```

3. **Test with Browser:**
- Open browser dev tools
- Check Network tab for failed requests
- Look for CORS error messages

4. **Common Fixes:**
- Rebuild and redeploy backend
- Check environment variables
- Verify origin is in allowed list
- Ensure OPTIONS handlers are working

### Emergency CORS Fix
If CORS breaks completely, temporarily allow all origins:

```rust
// TEMPORARY - Only for emergency
response
    .headers_mut()
    .insert("access-control-allow-origin", HeaderValue::from_static("*"));
```

**⚠️ WARNING:** Only use this temporarily and fix properly afterward.

## Environment Variables Reference

### Railway Environment Variables
Set these in your Railway dashboard:

```bash
# Frontend URL
FRONTEND_URL=https://fundify.vercel.app

# CORS Origins (comma-separated)
CORS_ORIGINS=https://fundify.vercel.app,https://fundify-app.vercel.app

# Alternative names
NEXT_PUBLIC_FRONTEND_URL=https://fundify.vercel.app
NEXT_PUBLIC_SITE_URL=https://fundify.vercel.app
```

### Vercel Environment Variables
Set these in your Vercel dashboard:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://perfect-happiness-production.up.railway.app/api
```

## Maintenance Schedule

### Weekly
- [ ] Check for CORS errors in production logs
- [ ] Verify all environments are working
- [ ] Test critical user flows

### Before Major Deployments
- [ ] Review CORS configuration
- [ ] Test all environments
- [ ] Update documentation if needed

### When Adding New Features
- [ ] Check if new endpoints need CORS
- [ ] Test with different origins
- [ ] Update this documentation

## Quick Reference Commands

### Test CORS Locally
```bash
# Start backend
cd backend-rs && cargo run

# Test in another terminal
curl -H "Origin: http://localhost:3000" http://localhost:4000/api/campaigns
```

### Deploy CORS Fix
```bash
# Commit changes
git add -A
git commit -m "Fix CORS configuration"

# Push to trigger deployment
git push origin main
```

### Check Deployment Status
```bash
# Check if backend is responding
curl https://perfect-happiness-production.up.railway.app/health

# Check CORS headers
curl -I https://perfect-happiness-production.up.railway.app/api/campaigns
```

---

**Last Updated:** October 21, 2025  
**Maintained By:** Development Team  
**Status:** ✅ Working - All CORS issues resolved
