# Cloudinary Setup Guide

## Problem: Railway Ephemeral Storage

Railway uses **ephemeral storage**, meaning any files uploaded to the server's filesystem will be **deleted** when the server restarts or redeploys. This causes 404 errors for images and videos.

## Solution: Cloud Storage (Cloudinary)

The application now supports Cloudinary for permanent cloud storage of media files.

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com/) and sign up for a free account
2. After signing up, go to your Dashboard
3. You'll see your **Cloud Name**, **API Key**, and **API Secret**

### 2. Configure Backend Environment Variables

Add these three environment variables to your Railway backend deployment:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**In Railway:**
1. Go to your backend service
2. Click on "Variables" tab
3. Add each of the three variables above
4. Redeploy your backend

### 3. Verify Setup

Once configured, the backend will automatically:
- ✅ Use Cloudinary for all media uploads (images, videos, files)
- ✅ Return full Cloudinary URLs (e.g., `https://res.cloudinary.com/...`)
- ✅ Store media permanently in the cloud
- ✅ Provide automatic image optimization and transformations

### 4. Test Upload

1. Log in to your application
2. Go to Creator Dashboard → New Post
3. Upload an image or video
4. Create the post
5. View the post on your creator profile
6. Media should load correctly and persist after redeploys

## Fallback Behavior

If Cloudinary is **not configured**, the application will:
- ⚠️ Fall back to local disk storage (only works in development)
- ⚠️ Show a warning in server logs: `"Using local storage. Configure Cloudinary for production!"`
- ⚠️ Uploads will be lost on Railway restarts/redeploys

## Cloudinary Free Tier

The free tier includes:
- 25 GB storage
- 25 GB bandwidth per month
- 25,000 transformations per month
- Perfect for getting started!

## File Organization

Media files are automatically organized in Cloudinary:
- `/fundify/images/` - All uploaded images
- `/fundify/videos/` - All uploaded videos
- `/fundify/files/` - All uploaded attachments

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Node.js SDK Guide](https://cloudinary.com/documentation/node_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)

