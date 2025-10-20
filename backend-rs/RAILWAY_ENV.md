# Railway Environment Variables for Rust Backend

## Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT Authentication
JWT_SECRET=your-secret-key-here

# Server (Railway auto-provides PORT)
PORT=4000
```

## Optional Variables

```bash
# Database Pool Configuration
DATABASE_MAX_CONNECTIONS=10
DATABASE_ACQUIRE_TIMEOUT_SECS=3

# JWT Configuration
JWT_ISSUER=fundify-backend
JWT_AUDIENCE=fundify-clients
JWT_EXPIRATION_SECS=86400  # 24 hours

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration (Railway defaults)
HOST=0.0.0.0
SERVER_PORT=${{PORT}}

# Application Environment
APP_ENV=production
RUST_LOG=info
```

## Current Railway Configuration

Based on your variables table, you have:
- ✅ DATABASE_URL
- ✅ JWT_SECRET
- ✅ PORT
- ✅ SUPABASE_URL
- ⚠️ SUPABASE_ANON_KEY (but backend needs SUPABASE_SERVICE_ROLE_KEY)

## Notes

1. **Health Check**: Available at `/health`
2. **Timeout**: Health check timeout set to 120s to allow for database cold starts
3. **Database Retry**: Application retries database connection up to 8 times with exponential backoff
4. **Supabase**: Optional - if not configured, features using Supabase will be disabled
