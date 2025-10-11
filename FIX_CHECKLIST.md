# ✅ Simple Fix Checklist

## 🎯 Two Problems, Two Solutions

### Problem 1: Likes/Comments Not Working ❌
**Cause:** Database tables don't exist

### Problem 2: Media Disappears After Refresh ❌  
**Cause:** Supabase bucket missing or private

---

## 🔧 Solution 1: Fix Database (5 minutes)

### Go to Railway:
1. Backend project → **Settings** → Scroll down
2. Find "**Railway CLI**" section
3. Click "**Generate Token**"
4. Run in your terminal:
```bash
railway link
railway run npx prisma db push
```

**OR simpler:** Just tell me and I'll write a startup script to auto-create tables.

---

## 🔧 Solution 2: Fix Supabase (2 minutes)

### Go to Supabase Dashboard:
**https://supabase.com/dashboard/project/xljawtuavcznqigmbrpt/storage/buckets**

### Check:
1. **Does `fundify-media` bucket exist?**
   - ❌ No → Create it (Public bucket ✅)
   - ✅ Yes → Continue

2. **Is it Public?**
   - ❌ No → Click bucket → Settings → Make public
   - ✅ Yes → Continue

3. **Test it:** Upload an image in 3 minutes after Railway redeploys

---

## ⏰ Timeline:

```
Now        → Waiting for Railway to redeploy (2 min)
+2 min     → Fix Supabase bucket (30 seconds)
+3 min     → Upload test image
+3 min     → Check if URL starts with supabase.co
+4 min     → Fix database (railway run prisma db push)
+5 min     → ✅ Test likes/comments
```

---

## 🧪 Final Test (After Both Fixes):

### 1. Upload Image:
- Create post → Upload image
- Check console → Should see: `✅ Uploaded to Supabase: https://xljawtuavcznqigmbrpt.supabase.co/...`

### 2. Like Post:
- Click heart
- Refresh page
- Heart still filled? ✅

### 3. Comment:
- Add comment
- Refresh page  
- Comment still there? ✅

---

## 🆘 If Still Broken:

**Tell me:**
1. Screenshot of Railway logs after uploading
2. Screenshot of Supabase bucket settings
3. Copy any error messages

**Most likely you'll see in Railway logs:**
```
❌ Supabase upload failed, falling back to local
   Error: [THE PROBLEM WILL BE HERE]
```

That error message will tell us exactly what's wrong!

---

## 🎯 TL;DR:

1. **Wait 2 minutes** for Railway
2. **Check Supabase** → Create `fundify-media` bucket (Public)
3. **Upload test image** → Check logs for errors
4. **Fix database** → `railway run npx prisma db push`
5. **Test everything** → Done! ✅

**Ready to test in ~2-3 minutes!** ⏰

