# 🔍 IMAGE UPLOAD DEBUG GUIDE

## ADIM 1: Browser Console'u Temizle ve Hazırla

1. **Profile Edit sayfasına git:** 
   - http://localhost:3000/creator-dashboard/profile

2. **F12 tuşuna bas** (Developer Tools)

3. **Console sekmesine git**

4. **Console'u temizle:**
   - Sağ tıkla → "Clear console" 
   - VEYA Ctrl+L (Windows/Linux) / Cmd+K (Mac)

5. **Console'da şunu yaz ve Enter'a bas:**
   ```javascript
   console.log("🧪 TEST: Console çalışıyor!")
   ```
   
   **Görmeli:** `🧪 TEST: Console çalışıyor!`
   
   ❌ **Görmüyorsan:** Console çalışmıyor, başka browser'da dene!

---

## ADIM 2: Sayfa Yenilenirken Logları İzle

1. **Console temiz olmalı** (Clear console yaptın)

2. **Sayfayı yenile** (Ctrl+R veya F5)

3. **Console'da şunu görmeli:**
   ```
   📥 Loading profile...
   ✅ Profile loaded successfully
   ```

   ❌ **Görmüyorsan:** 
   - Hard refresh yap: **Ctrl+Shift+R** (Windows/Linux) veya **Cmd+Shift+R** (Mac)
   - Tekrar yenile

---

## ADIM 3: Avatar Upload Test

1. **Console hala açık olmalı**

2. **Profile Picture'da "Choose file" tıkla**

3. **Küçük bir resim seç** (örn: 500KB)

4. **Console'da şunu görmeli:**
   ```
   📤 Uploading avatar: photo.jpg (456.78 KB)
   ```

5. **Birkaç saniye sonra:**
   - ✅ **BAŞARILI:**
     ```
     ✅ avatar uploaded: https://...
     🔄 FormData updated, hasChanges will be true
     ✅ Changes detected!
        Changed fields: ["avatar"]
     ```
   
   - ❌ **BAŞARISIZ:**
     ```
     ❌ avatar upload error: ...
        Status: 401 (veya 400, 500)
        Response: { message: "..." }
        Message: "..."
     ```

---

## ADIM 4: Error Durumunda

### Hata 1: Hiçbir şey yazmıyor
**Sebep:** Sayfa cache'lenmiş, eski kod çalışıyor

**Çözüm:**
1. **Hard Refresh:** Ctrl+Shift+R (Windows/Linux) / Cmd+Shift+R (Mac)
2. **Cache temizle:** F12 → Network sekmesi → "Disable cache" işaretle
3. **Sayfayı yenile**

### Hata 2: "Unauthorized" (401)
**Sebep:** Token geçersiz

**Çözüm:**
1. Logout yap
2. Tekrar login ol
3. Profile Edit'e git
4. Tekrar dene

### Hata 3: "new row violates row-level security"
**Sebep:** Supabase RLS policy eksik

**Çözüm:**
1. Supabase Dashboard'a git
2. Storage → fundify-media
3. Policies → "New Policy"
4. INSERT için public policy ekle

### Hata 4: Network Error
**Sebep:** Backend erişilemiyor

**Çözüm:**
1. Railway logs'u kontrol et
2. Backend crash olmuş olabilir

---

## ADIM 5: Backend Logs Kontrol (Railway)

1. **Railway Dashboard'a git**
2. **Backend service'i seç**
3. **Logs sekmesi**
4. **Upload yaparken logları izle:**

   **BAŞARILI:**
   ```
   📤 Uploading image: photo.jpg Size: 456789
   🔄 Attempting Supabase upload...
   ✅ Uploaded to Supabase: https://...
   ✅ Upload successful: https://...
   ```

   **BAŞARISIZ:**
   ```
   Upload failed: No user ID found in request
   // VEYA
   ❌ Supabase upload failed
   ```

---

## SORU: Console'da hiçbir şey yazmıyor mu?

### Test 1: Console çalışıyor mu?
```javascript
// Console'a yapıştır:
console.log("TEST 1: Console çalışıyor")
console.error("TEST 2: Error çalışıyor")
console.warn("TEST 3: Warning çalışıyor")
```

Hiçbirini görmüyorsan:
- **Başka browser dene** (Chrome, Firefox)
- **Incognito/Private mode dene**

### Test 2: React app çalışıyor mu?
```javascript
// Console'a yapıştır:
window.location.href
```

Görmeli: `"http://localhost:3000/creator-dashboard/profile"`

### Test 3: Axios çalışıyor mu?
```javascript
// Console'a yapıştır:
axios.get("https://jsonplaceholder.typicode.com/todos/1")
  .then(r => console.log("✅ Axios çalışıyor:", r.data))
  .catch(e => console.log("❌ Axios çalışmıyor:", e))
```

---

## Bana Gönder:

Eğer sorun devam ediyorsa, **tam olarak şunu gönder:**

1. **Console screenshot'u** (tüm ekran, tüm loglar görünsün)
2. **Network sekmesi screenshot'u** (F12 → Network → upload yaparken)
3. **Railway backend logs** (upload yaparken)
4. **Hangi browser kullanıyorsun?** (Chrome, Firefox, Safari?)
5. **localhost mu yoksa deployed site mi?** (funify.vercel.app?)

Bu bilgilerle tam olarak sorunu görebilirim!

