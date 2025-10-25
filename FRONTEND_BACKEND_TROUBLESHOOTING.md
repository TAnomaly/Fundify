# Frontend-Backend Troubleshooting Guide

## ✅ Çözülen Sorunlar

### 1. 401 Unauthorized Hatası
**Sorun:** Frontend'de creators, campaigns, events sayfalarında 401 hatası
**Çözüm:** 
- Environment variable oluştur: `.env.local` dosyasına `NEXT_PUBLIC_API_URL=http://localhost:4000/api` ekle
- Frontend'i yeniden başlat: `npm run dev`

### 2. Frontend Login Redirect Sorunu
**Sorun:** Public endpoint'ler için 401 hatası aldığında login sayfasına yönlendirme
**Çözüm:** 
- `lib/api.ts`'de axios interceptor'ı düzelt
- Public endpoint'ler için redirect'i devre dışı bırak

### 3. Backend Authentication Middleware
**Sorun:** Backend'de public endpoint'ler authentication gerektiriyor
**Çözüm:** 
- `backend/src/middleware.rs`'de public path'leri ekle:
  - `/api/creators`
  - `/api/campaigns` 
  - `/api/events`
  - `/api/posts`
  - `/api/products`

## 🔧 Hızlı Çözümler

### Frontend 401 Hatası
```bash
# 1. Environment variable oluştur
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api' > frontend/.env.local

# 2. Frontend'i yeniden başlat
pkill -9 -f "next"
cd frontend && npm run dev
```

### Backend 500 Hatası
```bash
# 1. Backend'i yeniden başlat
pkill -9 -f "funify-backend"
cd backend && cargo run
```

### Database Bağlantı Sorunu
```bash
# 1. Database URL'i kontrol et
echo $DATABASE_URL

# 2. Backend'i environment variable ile başlat
DATABASE_URL="postgresql://..." PORT="4000" cargo run
```

## 📋 Test Checklist

### Frontend Test
- [ ] `http://localhost:3000` açılıyor
- [ ] `/creators` sayfasında creator'lar görünüyor
- [ ] `/campaigns` sayfasında campaign'ler görünüyor
- [ ] `/events` sayfasında event'ler görünüyor
- [ ] Console'da 401 hatası yok

### Backend Test
- [ ] `curl http://localhost:4000/api/creators` 200 OK
- [ ] `curl http://localhost:4000/api/campaigns` 200 OK
- [ ] `curl http://localhost:4000/api/events` 200 OK

### Database Test
- [ ] Backend log'larında database connection OK
- [ ] Sample data var (creators, campaigns, events)

## 🚨 Yaygın Hatalar

### 1. "Request failed with status code 401"
**Sebep:** Environment variable yok veya yanlış
**Çözüm:** `.env.local` dosyası oluştur

### 2. "Failed to load data"
**Sebep:** Backend API 500 hatası
**Çözüm:** Backend log'larını kontrol et, database bağlantısını test et

### 3. "upstream image response failed 404"
**Sebep:** Sample data'da yanlış image URL'leri
**Çözüm:** Database'de avatar URL'lerini güncelle

## 🔍 Debug Komutları

```bash
# Frontend durumu
curl -s http://localhost:3000 | head -1

# Backend durumu  
curl -s http://localhost:4000/api/creators | jq '.' | head -5

# Process kontrolü
ps aux | grep -E "(funify-backend|next dev)" | grep -v grep

# Environment variable kontrolü
cat frontend/.env.local
```

## 📝 Notlar

- Frontend port: 3000
- Backend port: 4000
- Database: NeonDB PostgreSQL
- Environment variable: `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
- Public endpoints: creators, campaigns, events, posts, products
