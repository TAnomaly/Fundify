import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import path from 'path';

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

    // Return the file URL (relative path)
    const fileUrl = `/uploads/images/${req.file.filename}`;

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

    // Return the file URL (relative path)
    const fileUrl = `/uploads/videos/${req.file.filename}`;

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

    const files = req.files.map((file) => ({
      url: `/uploads/images/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    }));

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
      response.images = files.images.map((file) => ({
        url: `/uploads/images/${file.filename}`,
        filename: file.filename,
        size: file.size,
      }));
    }

    // Process video
    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      response.video = {
        url: `/uploads/videos/${videoFile.filename}`,
        filename: videoFile.filename,
        size: videoFile.size,
      };
    }

    // Process attachments
    if (files.attachments) {
      response.attachments = files.attachments.map((file) => ({
        url: `/uploads/files/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      }));
    }

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};
