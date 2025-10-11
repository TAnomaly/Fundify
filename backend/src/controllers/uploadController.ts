import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import path from 'path';
import { useCloudStorage } from '../middleware/upload';
import { uploadToSupabase, isSupabaseConfigured } from '../config/supabase';
import fs from 'fs';

// Helper to get file URL
const getFileUrl = async (file: Express.Multer.File, folder: string): Promise<string> => {
  // Priority 1: Supabase Storage (most professional)
  if (isSupabaseConfigured()) {
    try {
      console.log('🔄 Attempting Supabase upload for:', file.originalname);
      console.log('   File path:', file.path);
      console.log('   File size:', file.size);

      const fileBuffer = fs.readFileSync(file.path);
      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      console.log('   Target path in Supabase:', fileName);

      const publicUrl = await uploadToSupabase(fileBuffer, fileName, file.mimetype);

      // Delete local temp file
      fs.unlinkSync(file.path);

      console.log('✅ Uploaded to Supabase:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Supabase upload failed, falling back to local');
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
      console.error('   Bucket: fundify-media');
      console.error('   Make sure bucket exists and is PUBLIC in Supabase Storage!');
    }
  }

  // Priority 2: Cloudinary (if configured)
  if (useCloudStorage && (file as any).path) {
    return (file as any).path;
  }

  // Priority 3: Local/Railway Volume storage
  return `/uploads/${folder}/${file.filename}`;
};

// Upload single image
export const uploadImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Get file URL (Supabase, Cloudinary, or local)
    const fileUrl = await getFileUrl(req.file, 'images');

    res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Upload single video
export const uploadVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Get file URL (Supabase, Cloudinary, or local)
    const fileUrl = await getFileUrl(req.file, 'videos');

    res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        duration: null, // TODO: Extract video duration using ffprobe
      },
    });
  } catch (error) {
    next(error);
  }
};

// Upload multiple images
export const uploadMultipleImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const files = await Promise.all(
      req.files.map(async (file) => ({
        url: await getFileUrl(file, 'images'),
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      }))
    );

    res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};

// Upload post media (mixed: images + video + attachments)
export const uploadPostMedia = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!req.files) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const response: {
      images?: any[];
      video?: any;
      attachments?: any[];
    } = {};

    // Process images
    if (files.images) {
      response.images = await Promise.all(
        files.images.map(async (file) => ({
          url: await getFileUrl(file, 'images'),
          filename: file.filename,
          size: file.size,
        }))
      );
    }

    // Process video
    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      response.video = {
        url: await getFileUrl(videoFile, 'videos'),
        filename: videoFile.filename,
        size: videoFile.size,
      };
    }

    // Process attachments
    if (files.attachments) {
      response.attachments = await Promise.all(
        files.attachments.map(async (file) => ({
          url: await getFileUrl(file, 'files'),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        }))
      );
    }

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};
