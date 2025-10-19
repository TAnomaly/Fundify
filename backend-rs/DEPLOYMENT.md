# 🚀 Fundify Rust Backend - Railway Deployment Guide

## ✅ Tamamlananlar

### 1. Proje Yapısı
- ✅ Tüm backend endpoints implement edildi (100+ endpoint)
- ✅ Authentication & Authorization (JWT)
- ✅ Campaign management
- ✅ Subscriptions & Memberships
- ✅ Stripe payment integration
- ✅ File uploads (Supabase)
- ✅ Notifications, Messages, Analytics
- ✅ 21 migration dosyası hazır

### 2. Dependencies Eklendi
- ✅ `lettre` - Email sending
- ✅ `redis` - Caching
- ✅ `async-stripe` - Stripe payments
- ✅ `tower_governor` - Rate limiting
- ✅ `sqlx` with bigdecimal support

### 3. Deployment Dosyaları
- ✅ `Dockerfile` - Optimized multi-stage build
- ✅ `docker-compose.yml` - Local development
- ✅ `railway.toml` - Railway configuration
- ✅ `.env` & `.env.example` - Environment templates
- ✅ `justfile` - Development commands
- ✅ `README.md` - Complete documentation

### 4. Database
- ✅ PostgreSQL migrations hazır
- ✅ Tüm tablolar oluşturuldu (users, campaigns, donations, subscriptions, vb.)
- ✅ Schema düzeltmeleri yapıldı

## 🎯 Railway'e Deploy Adımları

### Adım 1: Railway CLI Kurulumu

\`\`\`bash
# Railway CLI yükle
npm install -g @railway/cli

# Railway'e giriş yap
railway login
\`\`\`

### Adım 2: Proje Oluştur

\`\`\`bash
cd /home/tugmirk/Desktop/fundify/backend-rs

# Yeni Railway projesi başlat
railway init
# Proje adı: fundify-rust-backend

# Veya mevcut projeye bağlan
railway link
\`\`\`

### Adım 3: PostgreSQL Ekle

\`\`\`bash
# PostgreSQL veritabanı ekle
railway add postgresql

# Railway otomatik olarak DATABASE_URL environment variable'ı set eder
\`\`\`

### Adım 4: Environment Variables Ayarla

Railway dashboard'dan veya CLI ile:

\`\`\`bash
# JWT Secret
railway variables set JWT_SECRET="fundify-super-secret-jwt-key-change-in-production-minimum-32-characters-long"

# JWT Config
railway variables set JWT_ISSUER="fundify-api"
railway variables set JWT_AUDIENCE="fundify-users"
railway variables set JWT_EXPIRATION_SECS="604800"

# Stripe Keys (get from your Stripe dashboard)
railway variables set STRIPE_SECRET_KEY="sk_test_YOUR_STRIPE_SECRET_KEY_HERE"
railway variables set STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE"
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_STRIPE_WEBHOOK_SECRET_HERE"

# Supabase Storage (get from your Supabase project settings)
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key_here"

# CORS (Frontend URL'inizi girin)
railway variables set CORS_ORIGIN="https://your-frontend-url.vercel.app"
railway variables set FRONTEND_URL="https://your-frontend-url.vercel.app"

# Optional: Redis
# railway add redis
# railway variables set REDIS_URL="redis://..."

# Optional: Email (SMTP)
# railway variables set SMTP_HOST="smtp.gmail.com"
# railway variables set SMTP_PORT="587"
# railway variables set SMTP_USERNAME="your-email@gmail.com"
# railway variables set SMTP_PASSWORD="your-app-password"
# railway variables set SMTP_FROM="noreply@fundify.com"
\`\`\`

**ÖNEMLİ:** Railway otomatik olarak şunları sağlar:
- `DATABASE_URL` - PostgreSQL bağlantı string'i
- `PORT` - Dinamik port numarası
- `RAILWAY_ENVIRONMENT` - Environment name

### Adım 5: Deploy

\`\`\`bash
# Deploy et
railway up

# Veya git push ile
git push railway main
\`\`\`

### Adım 6: Migrations Çalıştır

İlk deployment'tan sonra:

\`\`\`bash
# Railway container'da migrations çalıştır
railway run sqlx migrate run

# Veya Railway Shell'den
railway shell
sqlx migrate run
\`\`\`

### Adım 7: Logs İzle

\`\`\`bash
# Real-time logs
railway logs

# Dashboard'u aç
railway open
\`\`\`

## 🔧 Railway Build Notları

### Dockerfile Stratejisi

Railway, `Dockerfile`'ı otomatik algılar ve kullanır. Bizim Docker file:

1. **Multi-stage build** - Küçük image boyutu (~100MB)
2. **Dependency caching** - Hızlı build'ler
3. **SQLX_OFFLINE=true** - Compile-time DB bağlantısı gerektirmez
4. **Health check** - `/health` endpoint

### Important Notes

1. **SQLX Offline Mode**: Railway build sırasında DATABASE_URL olmadığı için offline mod kullanıyoruz
2. **Port Binding**: Railway dinamik PORT sağlar, kodumuz bunu okur
3. **Migrations**: İlk deploy'dan sonra manuel çalıştırmalısınız

## 📊 Deploy Sonrası Kontroller

\`\`\`bash
# Health check
curl https://your-app.railway.app/health

# API test
curl https://your-app.railway.app/api/v1/health

# PostgreSQL bağlantısı test
railway run psql
\`\`\`

## 🐛 Troubleshooting

### Build Hataları

**Problem:** SQLX compile errors
**Çözüm:**  Database kolonlarını kontrol edin, schema ile kod eşleşmeli

**Problem:** Dependency resolution errors
**Çözüm:** `Cargo.lock` silin ve `cargo build` çalıştırın

### Runtime Hataları

**Problem:** Database connection failed
**Çözüm:** PostgreSQL addon'ının aktif olduğunu kontrol edin

**Problem:** Port binding errors
**Çözüm:** Kodun `$PORT` environment variable'ını okuduğundan emin olun

### Migration Hataları

**Problem:** Migrations failed
**Çözüm:** 
\`\`\`bash
# Railway shell'de
railway shell
sqlx migrate revert
sqlx migrate run
\`\`\`

## 🎉 Başarılı Deployment

Deployment başarılı olduktan sonra:

1. ✅ API URL: `https://your-app.railway.app`
2. ✅ Health endpoint: `/health`
3. ✅ API base: `/api/v1`
4. ✅ Swagger docs: `/api/docs` (TODO: implement)

## 📝 Next Steps

1. Frontend'i Railway URL'e bağlayın
2. Stripe webhook'u Railway URL'e yapılandırın
3. Production JWT secret güncelleyin
4. CORS origins güncelleyin
5. Rate limiting ayarlayın
6. Monitoring ekleyin (Sentry, Datadog)
7. CDN setup (Cloudflare)
8. Backup stratejisi planlayın

## 🔒 Güvenlik Kontrolleri

- [ ] JWT_SECRET production key ile değiştirildi
- [ ] Stripe production keys kullanıldı
- [ ] CORS origins kısıtlandı
- [ ] Rate limiting aktif
- [ ] HTTPS zorlaması aktif
- [ ] Environment variables gizli
- [ ] Database backup planı var

---

**Deployment Date:** 2025-10-20
**Version:** 0.1.0
**Rust Version:** 1.83
**Database:** PostgreSQL 16
