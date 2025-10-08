# 🎉 STRIPE SUBSCRIPTION SYSTEM - KURULUM REHBER

## ✅ TAMAMLANDI:

### Backend:
- ✅ Stripe entegrasyonu hazır
- ✅ Checkout session creation
- ✅ Customer portal
- ✅ Webhook handling
- ✅ Membership tier management API

### Frontend:
- ✅ Tier creation form (modal)
- ✅ Tier listing & management
- ✅ Subscribe button (TierCard)
- ✅ Stripe checkout redirect
- ✅ Customer portal access

---

## 🔑 STRIPE API KEYS KURULUMU

### 1️⃣ Stripe Dashboard'dan Anahtarları Al

```
📍 https://dashboard.stripe.com/test/apikeys

1. Stripe hesabına giriş yap
2. "Developers" → "API keys" sekmesine git
3. İki anahtar kopyala:
   - Publishable key (pk_test_...)
   - Secret key (sk_test_...)
```

### 2️⃣ Backend Environment Variables (Railway)

```
Railway Dashboard → fundify-backend → Variables

Ekle:
--------------------------------------------------
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx (webhook kurulumundan sonra)
FRONTEND_URL=https://funify.vercel.app
--------------------------------------------------

Save → Redeploy
```

### 3️⃣ Frontend Environment Variables (Vercel)

```
Vercel Dashboard → fundify → Settings → Environment Variables

Ekle:
--------------------------------------------------
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
NEXT_PUBLIC_API_URL=https://RAILWAY_BACKEND_URL
--------------------------------------------------

Save → Redeploy
```

---

## 🔄 KULLANIM AKIŞI:

### A) Creator Tarafı (Tier Oluşturma):

```
1. Creator ile login ol
2. /creator-dashboard → "Become Creator" (eğer değilse)
3. /creator-dashboard/tiers → "Create Tier"
4. Form doldur:
   - Tier Name: "Gold Supporter"
   - Description: "Premium access to all content"
   - Price: 9.99
   - Interval: Monthly
   - Perks: ["Early access", "Exclusive posts", "Discord role"]
5. Submit → Tier oluşturulur! ✅
```

### B) Subscriber Tarafı (Abone Olma):

```
1. /creators sekmesine git
2. Bir creator seç (örnek: /creators/tmirac)
3. Tier kartlarını gör
4. "Subscribe" butonuna bas
5. Stripe Checkout sayfası açılır 💳
6. Kart bilgilerini gir:
   - Test Card: 4242 4242 4242 4242
   - CVV: 123
   - Expiry: 12/34
7. Ödeme tamamla → Subscription aktif! 🎉
```

### C) Subscription Yönetimi:

```
1. /subscriptions sayfasına git
2. Aktif aboneliklerini gör
3. "Manage Subscription" → Stripe Customer Portal
4. Yapabileceklerin:
   - Ödeme metodunu güncelle
   - Subscription'ı iptal et
   - Invoice geçmişini gör
```

---

## 🧪 TEST MOD:

### Stripe Test Cards:

```javascript
// Başarılı Ödeme:
4242 4242 4242 4242

// 3D Secure Test:
4000 0027 6000 3184

// Declined Card:
4000 0000 0000 0002

// Tüm kartlar için:
CVV: Any 3 digits
Expiry: Any future date
ZIP: Any 5 digits
```

### Test Akışı:

```
1. Creator tier oluştur
2. Başka bir kullanıcı ile subscribe ol
3. Test kartı kullan (4242...)
4. Başarılı ödeme sonrası:
   - Subscription DB'de oluşur
   - User creator'a bağlanır
   - /subscriptions'da görünür
```

---

## 🎯 ÖNEMLİ NOTLAR:

### Webhook Kurulumu (Opsiyonel ama Önerilen):

```
Stripe Dashboard → Developers → Webhooks → Add endpoint

URL: https://RAILWAY_BACKEND_URL/api/stripe/webhook

Events to send:
  ✓ customer.subscription.created
  ✓ customer.subscription.updated
  ✓ customer.subscription.deleted
  ✓ invoice.paid
  ✓ invoice.payment_failed

Save → Webhook secret'i kopyala → Railway'e ekle (STRIPE_WEBHOOK_SECRET)
```

### Production'a Geçiş:

```
1. Stripe → Test Mode'dan Live Mode'a geç
2. Yeni API keys al (pk_live_..., sk_live_...)
3. Environment variables güncelle
4. Webhook'u yeniden kur (live mode için)
5. Business bilgilerini tamamla (Stripe Connect için)
```

---

## 📊 MEVCUT DURUMN:

### ✅ Hazır Olanlar:
- Backend Stripe controller
- Frontend tier management
- Checkout integration
- Customer portal
- Tier CRUD operations

### ⏳ Yapılması Gerekenler:
1. **Stripe API Keys Ekle** (Yukarıdaki adımları takip et)
2. **Test Et:**
   - Tier oluştur
   - Subscribe ol
   - Ödeme yap
3. **Webhook Kur** (Opsiyonel)

---

## 🚀 HIZLI BAŞLANGIÇ:

### 1. Stripe Anahtarlarını Al:
```bash
# Test Mode:
https://dashboard.stripe.com/test/apikeys

pk_test_... → Frontend (Vercel)
sk_test_... → Backend (Railway)
```

### 2. Railway'e Ekle:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Vercel'e Ekle:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Redeploy:
```
Railway → Redeploy
Vercel → Redeploy
```

### 5. Test Et:
```
1. /creator-dashboard/tiers → Create tier
2. /creators/USERNAME → Subscribe
3. Stripe Checkout → Use 4242 4242 4242 4242
4. Success! 🎉
```

---

## 🔧 TROUBLESHOOTING:

### "Stripe not configured" hatası:
```
→ API keys eksik
→ Railway/Vercel env variables kontrol et
→ Redeploy yap
```

### Checkout açılmıyor:
```
→ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY var mı?
→ Browser console'da error var mı?
→ Backend API URL doğru mu?
```

### Webhook çalışmıyor:
```
→ Webhook secret Railway'de var mı?
→ Webhook URL doğru mu?
→ Stripe Dashboard → Webhooks → Events log kontrol et
```

---

## 📚 KAYNAKLAR:

- Stripe Docs: https://stripe.com/docs
- Test Cards: https://stripe.com/docs/testing
- Checkout: https://stripe.com/docs/payments/checkout
- Customer Portal: https://stripe.com/docs/billing/subscriptions/customer-portal

---

**ŞİMDİ YAP:**

1. ✅ https://dashboard.stripe.com/test/apikeys → Keys al
2. ✅ Railway → Variables → Keys ekle
3. ✅ Vercel → Variables → Publishable key ekle
4. ✅ Redeploy (her iki taraf)
5. ✅ Test et!

**Deployment tamamlandığında, tier oluştur ve subscribe ol! 🚀**

