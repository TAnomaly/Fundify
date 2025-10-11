# Quick Test: Media Upload Issue

## Step 1: Check Backend Logs

When you upload a post with media, check your backend logs (Railway or local terminal) for:

```
⚠️ Using local storage. Configure Cloudinary for production!
```

If you see this warning, **Cloudinary is NOT configured** - files will be lost.

## Step 2: Open Browser Console (F12)

1. Open your app in browser
2. Press F12 to open Developer Tools
3. Go to **Console** tab
4. Try to create a new post with images/video
5. Look for:
   - Upload errors
   - 404 errors  
   - Media URL logs
   - CORS errors

## Step 3: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Create a new post with media
3. Look for:
   - `/api/upload/image` - Should return 200 OK
   - `/api/upload/video` - Should return 200 OK
   - Check the **Response** - does it have a URL?

## Step 4: Manual Test

Let me create a test script for you. Run this to test uploads:

```bash
cd /home/tugmirk/Desktop/fundify/backend
npm run dev
```

Then in another terminal:

```bash
# Test if upload endpoint works
cd /home/tugmirk/Desktop/fundify

# Create a test image
echo "Test" > test-image.txt

# Try to upload (replace TOKEN with your auth token)
curl -X POST http://localhost:4000/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@test-image.txt"
```

## Common Issues & Quick Fixes

### Issue 1: "Cannot see video and image"

**Most Likely Cause:** URLs are empty or malformed

**Check:**
```javascript
// In browser console, check the post data
console.log(post.images);  // Should be array of strings
console.log(post.videoUrl);  // Should be string or null
```

**Fix:** Make sure MediaUpload component is saving URLs correctly.

### Issue 2: "Cannot run the video"

**Possible Causes:**
1. Video URL is incorrect (404)
2. Video format not supported
3. CORS issue
4. File doesn't exist

**Fix:** Check browser console for exact error.

### Issue 3: Everything appears but doesn't work

**Cause:** Cloudinary not configured, files deleted

**Fix:** See QUICK_START.md for Cloudinary setup

## Emergency Fix: Check Current State

Run this to see what's happening:

```bash
cd /home/tugmirk/Desktop/fundify/frontend
npm run dev
```

Then:
1. Open http://localhost:3000
2. Open browser console (F12)
3. Go to creator profile with posts
4. Look for console errors
5. Copy and share the errors

## What to Look For

### Good Signs ✅
```
Media URL: {
  original: "https://res.cloudinary.com/...",
  base: "...",
  full: "https://res.cloudinary.com/..."
}
```

### Bad Signs ❌
```
GET http://localhost:4000/uploads/images/... 404 (Not Found)
GET http://localhost:4000/uploads/videos/... 404 (Not Found)
Failed to load resource
```

Or:

```
Media URL: {
  original: "",
  base: "...",
  full: "..."
}
```

## Next Steps

Based on what you see in the console, the issue is likely:

1. **Empty URLs** → MediaUpload component not working
2. **404 errors** → Cloudinary not configured / files deleted
3. **CORS errors** → Backend CORS configuration issue
4. **Format errors** → Video file issue

Share what you see in the console and I'll help fix it!

