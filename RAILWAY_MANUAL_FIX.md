# 🚨 RAILWAY BACKEND DOWN - MANUEL FIX GEREKLİ

## ❌ SORUN:
```
❌ fundify-backend-production.up.railway.app → 404
❌ web-production-5d89.up.railway.app → 404

Her iki backend de çalışmıyor!
```

---

## ✅ HEMEN YAP (5 Dakika):

### **ADIM 1: Railway Dashboard Aç**
```
📍 https://railway.app/dashboard

Login yap ve "fundify-backend" projesini bul
```

### **ADIM 2: Deployment Status Kontrol Et**

#### Göreceğin Durumlar:

**A) "No deployments found" / Proje yok**
```
SORUN: Backend proje Railway'de yok

ÇÖZÜM:
1. Yeni proje oluştur: "New Project" → "Deploy from GitHub"
2. fundify repo'sunu seç
3. Root Directory: "backend"
4. Deploy
```

**B) "Deployment Failed" / "Crashed"**
```
SORUN: Build veya runtime hatası

ÇÖZÜM:
1. Latest deployment'ı aç
2. "View Logs" tıkla
3. Error mesajını oku:

   Build Error?
   → Logs'daki hatayı bana söyle

   Runtime Error?
   → Env variables eksik olabilir

   Database Error?
   → DATABASE_URL kontrol et
```

**C) "Deployment Success" ama 404**
```
SORUN: App deploy olmuş ama çalışmıyor

ÇÖZÜM:
1. Settings → Networking
2. "Generate Domain" tıkla (eğer domain yoksa)
3. Public URL'yi kopyala
4. Test et: curl https://NEW-URL.up.railway.app/health
```

**D) Proje var ama eski commit'te**
```
SORUN: Son kodlar deploy olmamış

ÇÖZÜM:
1. Latest deployment'ın yanındaki "..." → Redeploy
2. Veya: Settings → "Redeploy" butonu
3. 2-5 dakika bekle
```

---

### **ADIM 3: Environment Variables Kontrol**

Railway'de bu variables olmalı:

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
PORT=4000 (genelde Railway otomatik set eder)
FRONTEND_URL=https://funify.vercel.app
NODE_ENV=production

# Optional (tier oluşturma için şimdilik gerekli değil):
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Eksik varsa:**
1. Variables tab → "New Variable"
2. Ekle ve Save
3. Manuel redeploy yap

---

### **ADIM 4: Test Et**

Backend deploy olduktan sonra:

```bash
# Health check
curl https://YOUR-RAILWAY-URL.up.railway.app/health

# Beklenen:
{"status": "ok"}

# Eğer 404:
→ URL yanlış veya app çalışmıyor
→ Logs kontrol et
```

---

## 🔍 COMMON ISSUES & FIXES:

### Issue 1: "Build Failed"
```
Log'da göreceğin:
- npm install errors → package.json bozuk
- TypeScript errors → Code hatası
- Missing dependencies → package.json eksik

FIX:
Logs'daki exact error'ı bana söyle, fix edelim
```

### Issue 2: "Application Crashed"
```
Log'da göreceğin:
- "Cannot connect to database" → DATABASE_URL yanlış
- "Port already in use" → PORT conflict
- "Module not found" → Dependencies eksik

FIX:
1. DATABASE_URL kontrol et
2. Dependencies: npm install
3. Redeploy
```

### Issue 3: "502 Bad Gateway"
```
SORUN: App başladı ama crash oluyor

FIX:
1. Runtime logs oku
2. Database connection test et
3. Environment variables kontrol et
```

---

## 📊 ALTERNATIVE: YENİ RAILWAY PROJE OLUŞTUR

Eğer fix edemezsen, yeni proje:

```
1. Railway Dashboard → New Project
2. "Deploy from GitHub repo"
3. fundify repo seç
4. Root Directory: backend
5. Environment Variables ekle:
   - DATABASE_URL
   - JWT_SECRET
   - FRONTEND_URL
6. Deploy
7. Domain generate et
8. Public URL'yi test et
```

---

## 🎯 DEPLOYMENT BAŞARILI OLUNCA:

### 1. Backend URL'ini Al:
```
Railway → Settings → Networking → Public Domain
Örnek: https://fundify-backend-production-abc123.up.railway.app
```

### 2. Vercel'de Güncelle:
```
1. https://vercel.com/dashboard
2. fundify → Settings → Environment Variables
3. NEXT_PUBLIC_API_URL → Edit
4. Value: https://YOUR-RAILWAY-URL.up.railway.app/api
5. Save
6. Deployments → Latest → Redeploy
```

### 3. Tier Oluştur:
```
Option A - UI:
1. https://funify.vercel.app/creator-dashboard/tiers
2. Create Tier form
3. Submit

Option B - Console Script (önceki script'i tekrar çalıştır):
1. Login
2. F12 → Console
3. Script çalıştır (backend URL güncellendiği için çalışır)
```

---

## 📝 ŞİMDİ YAPILACAKLAR (ÖNCELIK SIRASIYLA):

### Priority 1: Railway Backend'i Çalıştır
```
1. ✅ Railway dashboard aç
2. ✅ fundify-backend status kontrol et
3. ✅ Failed ise → Logs oku
4. ✅ Success ise → Domain kontrol et
5. ✅ Hiç yok ise → Yeni proje oluştur
6. ✅ Redeploy yap
```

### Priority 2: Test Et
```
curl https://YOUR-URL.up.railway.app/health

✅ {"status": "ok"} → Backend OK!
❌ 404 / 500 → Hala sorun var
```

### Priority 3: Frontend Güncelle
```
Vercel env variable:
NEXT_PUBLIC_API_URL=https://WORKING-RAILWAY-URL.up.railway.app/api
```

### Priority 4: Tier Oluştur
```
Backend çalışınca console script'i tekrar çalıştır
```

---

## 🚀 HIZLI YARDIM:

**Railway dashboard'da ne görüyorsun?**

A) "Deployment Failed" → Logs'daki error'u bana göster
B) "No project found" → Yeni proje oluştur
C) "Success ama 404" → Public domain URL'ini bana söyle
D) Başka bir durum → Screenshot at

**Railway dashboard'a git ve durumu söyle, birlikte halledelim!** 🔧

---

## 📞 DEBUGGING CHECKLIST:

- [ ] Railway dashboard açtım
- [ ] fundify-backend projesini buldum
- [ ] Latest deployment status: ____________
- [ ] Public Domain URL: ____________
- [ ] Environment variables var mı: YES / NO
- [ ] Logs'da error var mı: YES / NO
- [ ] Health check response: ____________

**Bu bilgileri doldur ve bana söyle!** 🎯
