# 🎯 "yoyoyoy" Creator'ını Görme Rehberi

## ⚠️ ÖNEMLİ: Creator Görünmesi İçin Gerekli Koşul

Creator'ın **Creators** sayfasında görünebilmesi için:

### ✅ Gereksinimler:
1. **Creator hesabı olmalı** (isCreator = true)
2. **CREATOR tipinde bir campaign oluşturulmalı**
3. **Campaign ACTIVE durumunda olmalı**

---

## 🔧 "yoyoyoy" Creator'ı İçin Adım Adım

### Adım 1: Creator Hesabını Kontrol Et

`yoyoyoy` hesabıyla login olduktan sonra:

1. `/creator-dashboard` sayfasına git
2. Eğer "Become a Creator" butonu görünüyorsa, tıkla
3. Artık creator hesabı hazır!

### Adım 2: CREATOR Kampanyası Oluştur

**ÖNEMLİ:** Normal campaign değil, **CREATOR tipinde** campaign lazım!

#### Option A: Backend'de Direkt Oluştur
```bash
# PostgreSQL veya Prisma Studio ile
# campaigns tablosuna şu tür bir kayıt ekle:

{
  "title": "yoyoyoy's Creator Page",
  "description": "Subscribe to exclusive content from yoyoyoy",
  "type": "CREATOR",  // ← ÖNEMLİ!
  "status": "ACTIVE",
  "creatorId": "yoyoyoy_user_id",
  "goalAmount": 0,
  "currentAmount": 0,
  ...
}
```

#### Option B: API ile Oluştur
```bash
POST /api/campaigns
{
  "title": "yoyoyoy's Creator Page",
  "description": "Join my creative journey!",
  "type": "CREATOR",
  "category": "ART",
  "goalAmount": 0,
  "imageUrl": "https://via.placeholder.com/800x400",
  "story": "Welcome to my creator page!"
}
```

### Adım 3: Membership Tier'ları Oluştur

Creator campaign oluşturduktan sonra tier ekle:

```bash
POST /api/memberships/campaigns/{campaignId}/tiers
{
  "name": "Basic Supporter",
  "description": "Support my work with basic perks",
  "price": 5,
  "interval": "MONTHLY",
  "perks": ["Early access to content", "Exclusive updates"],
  "isActive": true
}
```

### Adım 4: Creators Sayfasında Görüntüle

Artık:
1. `/creators` sayfasına git
2. "yoyoyoy" arama yap
3. Creator kartı görünecek!
4. Subscribe olabilirsin!

---

## 🎨 Şu An Creators Sayfası Nasıl Çalışıyor?

### API Flow:
```
1. GET /api/campaigns?type=CREATOR
   ↓
2. Campaign'lerden unique creator'ları çıkar
   ↓
3. Her creator için tier'ları yükle
   ↓
4. Creators grid'de göster
```

### Creator Görünme Koşulu:
```typescript
// Creator görünmesi için:
isCreator === true  AND  
hasCreatorCampaign === true  AND  
campaignType === 'CREATOR'
```

---

## 🚨 Sorun Giderme

### Sorun: "yoyoyoy" görünmüyor
**Çözüm:**
1. Database'de kontrol et:
   ```sql
   SELECT * FROM "User" WHERE name = 'yoyoyoy';
   -- isCreator true mu?
   
   SELECT * FROM "Campaign" WHERE type = 'CREATOR' AND "creatorId" = 'yoyoyoy_id';
   -- CREATOR campaign var mı?
   ```

2. Campaign tipi doğru mu kontrol et:
   ```sql
   UPDATE "Campaign" 
   SET type = 'CREATOR' 
   WHERE "creatorId" = 'yoyoyoy_id';
   ```

### Sorun: API hatası alıyorum
**Çözüm:** Console'da error mesajını kontrol et:
```javascript
// Browser console'da:
localStorage.getItem('authToken')  // Token var mı?
process.env.NEXT_PUBLIC_API_URL    // API URL doğru mu?
```

### Sorun: Tier'lar göründen görünmüyor
**Çözüm:** Tier'ları campaign'e bağlı ekle:
```bash
POST /api/memberships/campaigns/{campaignId}/tiers
```

---

## 📊 Test Checklist

- [ ] `yoyoyoy` user'ı `isCreator = true`
- [ ] `yoyoyoy` için `type = 'CREATOR'` campaign var
- [ ] Campaign `status = 'ACTIVE'`
- [ ] Campaign'de en az 1 membership tier var
- [ ] `/creators` sayfası yükleniyor
- [ ] Arama çubuğu çalışıyor
- [ ] "yoyoyoy" arandığında bulunuyor
- [ ] Creator kartı tıklanıyor
- [ ] Profile sayfası açılıyor (`/creators/yoyoyoy`)
- [ ] Tier'lar görünüyor
- [ ] Subscribe butonu çalışıyor

---

## 💡 Hızlı Test İçin Demo Creator Oluştur

Eğer test etmek istiyorsan:

```bash
# 1. Yeni user oluştur
POST /api/auth/register
{
  "email": "testcreator@example.com",
  "password": "password123",
  "name": "Test Creator"
}

# 2. Creator yap
POST /api/users/become-creator
(authenticated)

# 3. CREATOR campaign oluştur
POST /api/campaigns
{
  "type": "CREATOR",
  "title": "Test Creator's Page",
  ...
}

# 4. Tier ekle
POST /api/memberships/campaigns/{id}/tiers
{
  "name": "Basic",
  "price": 5,
  ...
}

# 5. /creators sayfasında gör!
```

---

## 🎯 Özet

**"yoyoyoy" görünmesi için:**

1. ✅ User `isCreator = true` olmalı
2. ✅ `type = 'CREATOR'` campaign olmalı  
3. ✅ Campaign `ACTIVE` olmalı
4. ✅ Tier'lar oluşturulmalı

**Bu koşullar sağlanırsa** `/creators` sayfasında otomatik görünecek!

---

**Deployment:** Vercel'de live olunca test et!  
**URL:** https://your-app.vercel.app/creators

