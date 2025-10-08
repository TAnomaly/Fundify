# 🚨 VERCEL ROOT DIRECTORY AYARI - ADIM ADIM

## Şu Anda Ne Oluyor?
```
npm error path /vercel/path0/package.json
npm error errno -2
npm error enoent Could not read package.json
```

Vercel root klasörde (/) package.json arıyor ama o frontend/ klasöründe.

## ✅ ÇÖZÜM (2 Dakika)

### Adım 1: Vercel Dashboard'a Git
1. Tarayıcında: https://vercel.com/dashboard
2. Giriş yap (GitHub ile)
3. **Fundify** projesine tıkla

### Adım 2: Settings'e Git
1. Üst menüden **Settings** sekmesine tıkla
2. Sol menüden **General** seçeneğini seç (zaten açık olabilir)

### Adım 3: Root Directory'yi Değiştir
1. Sayfayı aşağı kaydır
2. **"Root Directory"** başlığını bul
3. Şu anda boş veya `.` gösteriyor olabilir
4. Yanındaki **Edit** butonuna tıkla
5. Açılan kutucuğa: `frontend` yaz (tırnak olmadan)
6. **Save** butonuna tıkla

### Adım 4: Environment Variable Ekle
1. Sol menüden **Environment Variables** seç
2. **Add New** butonuna tıkla
3. Formu doldur:
   - **Name (required)**: `NEXT_PUBLIC_API_URL`
   - **Value (required)**: `https://perfect-happiness-production.up.railway.app/api`
   - **Environments**:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. **Save** butonuna tıkla

### Adım 5: Redeploy
1. Üst menüden **Deployments** sekmesine git
2. En üstteki (son) deployment'ı bul (şu anda FAILED durumda)
3. Deployment satırının sağındaki **⋮** (üç nokta) menüsüne tıkla
4. **Redeploy** seç
5. Açılan popup'ta **Redeploy** butonuna tekrar tıkla

### Adım 6: Bekle ve İzle
- Deploy ~2 dakika sürecek
- Status: Building → Ready ✅
- Artık site çalışacak!

## 🎉 Başarılı Olduğunu Nasıl Anlarım?

Deploy tamamlandıktan sonra:
1. Sitenin ana sayfasına git
2. F12 bas (Developer Tools)
3. Console sekmesine bak
4. "API URL: https://perfect-happiness-production.up.railway.app/api" yazısını görmelisin
5. Dashboard yüklenecek!

## ⚠️ ÖNEMLI
Root Directory ayarı yapmadan önce her deploy başarısız olacak!

## Ekran Görüntüsü Yardımı
Root Directory ayarı şöyle görünür:
```
┌─────────────────────────────────────┐
│ Root Directory                      │
│ ─────────────────────────────────── │
│ . (root)                      [Edit]│
└─────────────────────────────────────┘
```

Edit'e tıklayınca:
```
┌─────────────────────────────────────┐
│ Root Directory                      │
│ ─────────────────────────────────── │
│ [frontend          ]    [Save] [Cancel]│
└─────────────────────────────────────┘
```

## Hala Sorun mu Var?
Bana şunu söyle:
- "Root Directory ayarını yaptım ama hala hata veriyor"
- Veya deploy log'undan ilk 20 satırı paylaş
