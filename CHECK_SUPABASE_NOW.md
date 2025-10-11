# 🔍 Supabase Debug - Why Images Not Uploading

## ✅ Bucket exists!
- Endpoint: https://xljawtuavcznqigmbrpt.storage.supabase.co/storage/v1/s3
- Region: eu-central-1

## 🔧 Now Let's Find Why It's Not Working

### Step 1: Check Railway Environment Variables

**Go to:** Railway → Backend → Variables

**Must have EXACTLY:**
```
SUPABASE_URL=https://xljawtuavcznqigmbrpt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamF3dHVhdmN6bnFpZ21icnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjczNjUsImV4cCI6MjA3NTcwMzM2NX0.YrXdKjg_O7oja25Kre8NhePveDCmmKTwTquW5Ak3NEk
```

**Check:**
- [ ] SUPABASE_URL is there
- [ ] SUPABASE_ANON_KEY is there
- [ ] No typos
- [ ] No extra spaces

---

### Step 2: Check Bucket Name

**Go to:** https://supabase.com/dashboard/project/xljawtuavcznqigmbrpt/storage/buckets

**Bucket name MUST be:** `fundify-media` (exact!)

**Check:**
- [ ] Bucket name is `fundify-media` (NOT fundify, NOT media, NOT fundify_media)
- [ ] Bucket is **Public** (not private)
- [ ] Status is Active

---

### Step 3: Upload Test Image

1. Go to your site
2. Create new post
3. Upload ANY image
4. **IMMEDIATELY go to Railway → Logs**

**Look for these lines:**

**✅ If working:**
```
🔄 Attempting Supabase upload for: test.jpg
   File path: /tmp/...
   File size: 12345
   Target path in Supabase: images/1234567890-test.jpg
✅ Uploaded to Supabase: https://xljawtuavcznqigmbrpt.supabase.co/storage/v1/object/public/fundify-media/images/...
```

**❌ If NOT working:**
```
🔄 Attempting Supabase upload for: test.jpg
❌ Supabase upload failed, falling back to local
   Error: [THE EXACT ERROR WILL BE HERE]
   Stack: ...
   Bucket: fundify-media
```

---

### Step 4: Common Errors & Solutions

#### Error: "Bucket not found"
**Solution:** Bucket name is wrong or doesn't exist
- Go to Supabase → Create bucket named exactly `fundify-media`

#### Error: "Permission denied" / "403"
**Solution:** Bucket is private or policies missing
- Go to bucket → Settings → Make it Public
- Go to Policies → Add public read/write policies

#### Error: "Invalid JWT" / "401"
**Solution:** SUPABASE_ANON_KEY is wrong
- Go to Supabase → Settings → API
- Copy Anon Key again
- Update Railway variable

#### Error: "Cannot read property 'storage'" / "supabase is null"
**Solution:** SUPABASE_URL missing or wrong
- Check Railway variables
- Make sure URL is correct

---

## 🎯 Quick Fix Checklist:

Run through this in 2 minutes:

1. [ ] Railway → Variables → Both SUPABASE vars exist and correct
2. [ ] Supabase → Storage → Bucket named `fundify-media`
3. [ ] Bucket → Settings → Public is checked
4. [ ] Upload test image
5. [ ] Railway → Logs → Look for upload attempt
6. [ ] Copy any error message

---

## 📝 Tell Me:

After you check all this, tell me:

1. **Railway variables OK?** (Yes/No)
2. **Bucket name?** (Copy exact name)
3. **Bucket public?** (Yes/No)
4. **Railway logs show?** (Copy the Supabase upload lines)

---

## 🚀 Most Likely Issues:

Based on typical problems:

1. **80% chance:** Bucket not public or policies missing
2. **15% chance:** Bucket name not exactly `fundify-media`
3. **5% chance:** Railway variables missing/wrong

Let's find which one! 🔍

