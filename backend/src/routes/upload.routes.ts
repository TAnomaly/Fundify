import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  uploadImage,
  uploadVideo,
  uploadMultipleImages,
  uploadPostMedia,
} from '../controllers/uploadController';
import { uploadSingle, uploadMultiple, uploadFields } from '../middleware/upload';

const router = Router();

// Upload single image
router.post('/image', authenticate as any, uploadSingle('image', 'image'), uploadImage as any);

// Upload single video
router.post('/video', authenticate as any, uploadSingle('video', 'video'), uploadVideo as any);

// Upload multiple images (up to 10)
router.post(
  '/images',
  authenticate as any,
  uploadMultiple('images', 10, 'image'),
  uploadMultipleImages as any
);

// Upload post media (images + video + attachments)
router.post(
  '/post-media',
  authenticate as any,
  uploadFields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 },
    { name: 'attachments', maxCount: 5 },
  ]),
  uploadPostMedia as any
);

export default router;
