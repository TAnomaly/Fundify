# Railway Volume Kurulumu (Cloudinary Alternatifi)

## 🎯 Railway Volumes Nedir?

Railway Volumes, Railway'de **kalıcı depolama** sağlar. Sunucu yeniden başlatılsa bile dosyalar **silinmez**.

✅ **Avantajlar:**
- Ücretsiz başlangıç kapasitesi
- Harici servise kayıt gerektirmez
- Railway içinde kolay kurulum
- Dosyalar kalıcı olarak saklanır

❌ **Dezavantajlar:**
- CDN yok (Cloudinary'ye göre daha yavaş)
- Manuel yönetim gerekir
- Cloudinary'deki otomatik optimizasyon yok

---

## 📋 Kurulum Adımları

### Adım 1: Railway Dashboard'a Git

1. Railway.app'e giriş yap
2. **Backend servisini** seç

### Adım 2: Volume Ekle

1. Serviste **"Variables"** sekmesinin yanında **"Storage"** ya da **"Volumes"** sekmesini bul
2. **"New Volume"** butonuna tıkla
3. Ayarlar:
   ```
   Volume Name: uploads
   Mount Path: /app/uploads
   Size: 1GB (ücretsiz başlangıç)
   ```
4. **"Add Volume"** tıkla

### Adım 3: Servisi Yeniden Deploy Et

Volume ekledikten sonra Railway otomatik olarak yeniden deploy edecek.

### Adım 4: Test Et

1. Yeni bir post oluştur
2. Resim/video yükle
3. Post'u görüntüle - medya yüklenmeli
4. Railway'i yeniden başlat (veya bekle)
5. Sayfayı yenile - **medya hala orada olmalı** ✅

---

## 🔧 Alternative: Vercel Blob Storage

Eğer Railway Volumes çalışmazsa, Vercel Blob kullanabilirsin (frontend Vercel'de zaten):

### Avantajlar:
- Vercel hesabın zaten var
- Otomatik CDN
- 1GB ücretsiz

### Kurulum:
1. Vercel Dashboard → Storage → Blob
2. API anahtarlarını al
3. Backend'e environment variables ekle

---

## 📊 Karşılaştırma

| Özellik | Railway Volumes | Cloudinary | Vercel Blob |
|---------|----------------|------------|-------------|
| Kayıt Gerekli | ❌ Hayır | ✅ Evet | ❌ Hayır (zaten var) |
| Ücretsiz | ✅ 1GB | ✅ 25GB | ✅ 1GB |
| CDN | ❌ Yok | ✅ Var | ✅ Var |
| Kurulum | ⭐⭐⭐ Kolay | ⭐⭐ Orta | ⭐⭐ Orta |
| Hız | ⭐⭐ Orta | ⭐⭐⭐ Hızlı | ⭐⭐⭐ Hızlı |

---

## ✅ Hangi Çözüm?

**En Kolay:** Railway Volumes (yukarıdaki adımlar)
**En İyi:** Cloudinary (ama kayıt gerekli)
**Alternatif:** Vercel Blob

---

Railway Volumes ile devam etmek istiyorsan, Railway Dashboard'da Volume eklemeni bekleyebilirim!

