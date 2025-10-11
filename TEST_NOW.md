# 🚀 Testing Guide - After Railway Deployment

## What Just Happened?

**THE BUG:** Railway was skipping database migrations!
- Old command: `npm start` ❌ (no migrations)
- New command: `npm run deploy` ✅ (runs migrations first!)

**THE FIX:** Updated `nixpacks.toml` to run migrations on every deployment.

---

## ⏰ Timeline

```
Now (0:00)     → Code pushed to Railway
+1 minute      → Railway starts build
+2 minutes     → Build complete, starting deploy
+3 minutes     → Migrations running!
+4 minutes     → Server starting
+5 minutes     → ✅ READY TO TEST
```

---

## 🧪 Test Plan (In 5 Minutes)

### Step 1: Wait for Railway Logs

Go to Railway → Deployments → Latest deployment → Logs

**Look for these messages:**

```bash
✅ GOOD - You should see:
> npm run deploy
> npx prisma migrate deploy && npm start

Applying migration `20241011_add_post_likes_comments`
Database migrations complete!
🚀 Server running on port 4000
```

```bash
❌ BAD - If you see errors:
Error: Migration failed
```

---

### Step 2: Test Likes & Comments

1. **Go to your site:** https://funify.vercel.app
2. **Find any post**
3. **Click the heart (like) button**
   - Should fill with color ❤️
   - **Refresh the page** → Still filled? ✅
   
4. **Click comment button**
   - Type a comment
   - Press Enter
   - Should see "Comment added!" ✅
   - **Refresh the page** → Comment still there? ✅

---

### Step 3: Test Media Upload

**This will tell us if Supabase is working:**

1. **Create a new post**
2. **Upload an image**
3. **Press F12** to open browser console
4. **Look for this line:**

**✅ If you see this - PERFECT:**
```
✅ image uploaded successfully: https://xljawtuavcznqigmbrpt.supabase.co/storage/v1/object/public/fundify-media/images/...
```
→ **Media will persist forever!** 🎉

**❌ If you see this - PROBLEM:**
```
✅ image uploaded successfully: /uploads/images/...
```
→ **Still using local storage!** Files will disappear. 😢

---

## 🆘 If Tests Fail

### Problem: Likes/Comments don't persist

**Tell me:**
1. Copy the error from Railway logs
2. Try this in browser console:
   ```javascript
   fetch('https://perfect-happiness-production.up.railway.app/api/posts/likes', {
     headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
   }).then(r => r.json()).then(console.log)
   ```
3. Copy the result

---

### Problem: Media URL starts with `/uploads/`

This means Supabase variables are missing on Railway!

**Go to Railway → Backend → Variables:**

Check these exist:
```
SUPABASE_URL=https://xljawtuavcznqigmbrpt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsamF3dHVhdmN6bnFpZ21icnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjczNjUsImV4cCI6MjA3NTcwMzM2NX0.YrXdKjg_O7oja25Kre8NhePveDCmmKTwTquW5Ak3NEk
```

**If missing:** Add them → Railway will auto-redeploy

---

## ✅ Success Checklist

After Railway finishes (5 minutes):

- [ ] Railway logs show "Database migrations complete!"
- [ ] Like a post → refresh → still liked
- [ ] Add comment → refresh → still there
- [ ] Upload image → console shows Supabase URL (not `/uploads/`)
- [ ] Refresh page → image still loads
- [ ] Wait 5 minutes → image still loads

**All checked?** 🎉 **EVERYTHING WORKS!**

---

## 📝 What to Tell Me

After testing (in 5 minutes), tell me:

1. **Likes/Comments:** Working? (Yes/No)
2. **Media URL:** Copy the URL from console when uploading
3. **Any Errors:** Copy from Railway logs or browser console

**Testing in 5 minutes!** Set a timer! ⏰

