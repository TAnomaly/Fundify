# 🪣 Supabase Bucket Setup - FIX MISSING IMAGES/VIDEOS

## ⚠️ Problem:

Old posts show but images/videos don't open because:
- Files were stored locally on Railway
- Railway restarted → Files deleted
- Supabase NOT being used yet!

---

## ✅ Solution: Create Supabase Bucket (2 Minutes)

### Step 1: Go to Supabase Dashboard

**Direct Link:**
https://supabase.com/dashboard/project/xljawtuavcznqigmbrpt/storage/buckets

### Step 2: Create Bucket

1. Click "**New bucket**" button
2. Fill in:
   - **Name:** `fundify-media` (EXACT spelling!)
   - **✅ Check:** "Public bucket"
   - **Privacy:** Public
3. Click "**Create bucket**"

### Step 3: Set Policies (Important!)

1. Click on your new `fundify-media` bucket
2. Go to "**Policies**" tab
3. Click "**New Policy**"
4. Select: "**Allow public access to bucket**" template
5. Or use this SQL:

```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'fundify-media' );

CREATE POLICY "Authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'fundify-media' );
```

---

## 🧪 Test After Setup

### Upload New Image:

1. Create a new post
2. Upload an image
3. **Check Railway logs immediately:**

**✅ If successful:**
```
🔄 Attempting Supabase upload for: image.jpg
✅ Uploaded to Supabase: https://xljawtuavcznqigmbrpt.supabase.co/storage/v1/object/public/fundify-media/images/...
```

**❌ If failed:**
```
❌ Supabase upload failed, falling back to local
   Error: Bucket not found / Not public / No permissions
```

---

## 📊 What About Old Images?

**Bad news:** Old images stored locally are GONE (Railway deleted them on restart).

**Good news:** After bucket setup, NEW images will:
- ✅ Upload to Supabase
- ✅ Never disappear
- ✅ Work forever

**You need to:**
Re-upload any important images/videos in new posts.

---

## 🎯 Quick Checklist:

- [ ] Created `fundify-media` bucket
- [ ] Set to **Public**
- [ ] Added access policies
- [ ] Tested new upload
- [ ] Saw success in Railway logs

---

## 🆘 If Still Not Working:

Tell me what you see in Railway logs when uploading:
- Copy the "Attempting Supabase upload" lines
- Copy any error messages

---

**Do this NOW so future uploads work forever!** 🚀

