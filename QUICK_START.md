# 🚀 Quick Start: Fix Media Upload Issues

## The Problem
Your images and videos were getting 404 errors because **Railway deletes uploaded files on restart**.

## The Solution
I've integrated **Cloudinary** cloud storage so your media files are stored permanently.

## What You Need to Do

### 1. Sign Up for Cloudinary (2 minutes)
1. Go to https://cloudinary.com/users/register_free
2. Sign up (it's free - 25GB storage)
3. Go to Dashboard → Get your credentials

### 2. Add to Railway (1 minute)
1. Open Railway → Your backend service → **Variables** tab
2. Add these 3 variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name_from_dashboard
   CLOUDINARY_API_KEY=your_api_key_from_dashboard
   CLOUDINARY_API_SECRET=your_api_secret_from_dashboard
   ```
3. Click **Redeploy**

### 3. Push Changes (30 seconds)
```bash
cd /home/tugmirk/Desktop/fundify
git add .
git commit -m "Fix: Add Cloudinary for persistent media storage"
git push origin main
```

### 4. Test It
1. Log in to your app
2. Create a new creator post with images/videos
3. View the post → media should load ✅
4. Restart your Railway service → media still works ✅

## That's It!

All your new uploads will be stored in Cloudinary and work forever, even after redeploys.

## What Changed?

### Backend (`/backend`)
- ✅ Added Cloudinary integration
- ✅ Smart storage: Cloudinary in production, local for dev
- ✅ Returns full URLs for cloud-stored media

### Frontend (`/frontend`)
- ✅ Added smart URL handler
- ✅ Works with both Cloudinary URLs and local URLs
- ✅ Updated all media display components

### New Files
- `backend/src/config/cloudinary.ts` - Cloudinary config
- `frontend/lib/utils/mediaUrl.ts` - Smart URL handler
- `CLOUDINARY_SETUP.md` - Full setup guide
- `MEDIA_FIX_SUMMARY.md` - Technical details

## Still Not Working?

1. **Check Railway variables:** Make sure all 3 Cloudinary variables are set
2. **Redeploy:** After adding variables, redeploy the backend
3. **Check console:** Open browser console (F12) and check for errors
4. **Verify URLs:** Check what URLs are being requested

## Need Help?

Read the full guide: `CLOUDINARY_SETUP.md`
Technical details: `MEDIA_FIX_SUMMARY.md`

---

**Note:** Old posts with images uploaded before this fix will still have broken links (files were deleted by Railway). You'll need to re-upload media for those posts, or just create new posts going forward.

