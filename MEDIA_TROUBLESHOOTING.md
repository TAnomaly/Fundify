# Media Troubleshooting Guide

## Issues Fixed ✅

### 1. Images and Video Mixed Together
**Problem:** Images were hidden when a video existed. Clicking on images would play the video.

**Solution:** 
- Removed the condition that hid images when video existed
- Added clear section headers: "Video" and "X Images"
- Each media type now displays independently

### 2. Video Format Errors
**Problem:** "No video with supported format and MIME type found" error

**Solution:**
- Added multiple `<source>` tags with different MIME types (mp4, webm, ogg)
- Added `preload="metadata"` for better loading
- Removed the `src` attribute on `<video>` tag to let browser choose best format

---

## If Media Still Disappears After Refresh

This issue is likely due to **Cloudinary not being configured**. Here's why:

### The Problem
1. **Without Cloudinary:** Files upload to Railway's local filesystem
2. **Railway restarts:** Files are deleted (ephemeral storage)
3. **You refresh:** URLs in database point to deleted files → 404 errors

### The Solution: Configure Cloudinary

#### Step 1: Check if Cloudinary is Configured

Open your browser console (F12) and look for:
```
Media URL: {original: "/uploads/...", base: "...", full: "..."}
```

**If you see `/uploads/` paths:** Cloudinary is NOT configured ❌  
**If you see `https://res.cloudinary.com/` paths:** Cloudinary IS configured ✅

#### Step 2: Configure Cloudinary (If Not Done)

1. **Sign up:** https://cloudinary.com/users/register_free

2. **Get credentials from dashboard:**
   - Cloud Name
   - API Key
   - API Secret

3. **Add to Railway:**
   ```
   Railway → Backend Service → Variables
   
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Redeploy backend**

5. **Test:** Upload new media → Should persist after refresh

---

## Testing Checklist

### Test 1: Upload Post with Images Only
- [ ] Upload 1-3 images
- [ ] Create post
- [ ] Images appear with "X Images" header
- [ ] Each image displays separately
- [ ] Refresh page
- [ ] Images still load ✅

### Test 2: Upload Post with Video Only
- [ ] Upload video
- [ ] Create post
- [ ] Video appears with "Video" header
- [ ] Video plays correctly
- [ ] Refresh page
- [ ] Video still plays ✅

### Test 3: Upload Post with Both
- [ ] Upload 2+ images
- [ ] Upload video
- [ ] Create post
- [ ] See "Video" section first
- [ ] See "X Images" section below
- [ ] Both display independently
- [ ] Video doesn't interfere with images
- [ ] Refresh page
- [ ] Both still work ✅

### Test 4: Check Console for Errors
- [ ] Open browser console (F12)
- [ ] Look for 404 errors
- [ ] Check Media URL logs
- [ ] Verify URLs are correct

---

## Debug Mode

Debug logging is enabled in development. To see media URL construction:

1. Open browser console (F12)
2. Look for logs: `Media URL: {...}`
3. Check:
   - `original`: What's stored in database
   - `base`: API base URL
   - `full`: Final constructed URL

---

## Common Issues & Solutions

### Issue: "No video with supported format"
**Causes:**
- Video file is corrupted
- Unsupported video format
- URL is incorrect (404)

**Solutions:**
- Use MP4 format (most compatible)
- Check browser console for 404 errors
- Try a different video file
- Verify Cloudinary is configured

### Issue: Images show as broken
**Causes:**
- Files deleted by Railway (no Cloudinary)
- Incorrect URL construction
- CORS issues

**Solutions:**
- Configure Cloudinary (primary solution)
- Check browser console for errors
- Verify base URL is correct

### Issue: Media works initially but disappears later
**Cause:** Railway ephemeral storage (files deleted on restart)

**Solution:** Configure Cloudinary (permanent storage)

---

## Current Status

✅ **Fixed:** Images and video display separately  
✅ **Fixed:** Video MIME type issues  
✅ **Fixed:** Clear section headers added  
✅ **Added:** Debug logging  
✅ **Added:** Lazy loading for images  

⚠️ **Requires Action:** Configure Cloudinary for persistent storage

---

## Support

If issues persist after:
1. Configuring Cloudinary
2. Testing with new uploads
3. Checking console logs

Then check:
- `CLOUDINARY_SETUP.md` for detailed setup
- `QUICK_START.md` for quick configuration guide
- Railway deployment logs for errors

