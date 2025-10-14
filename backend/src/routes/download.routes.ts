import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import * as downloadController from '../controllers/downloadController';

const router = Router();

// Public routes
router.get('/downloads/creator/:creatorId', optionalAuth as any, downloadController.getCreatorDownloads as any);
router.get('/downloads/:id', optionalAuth as any, downloadController.getDownloadById as any);

// Protected routes
router.post('/downloads', authenticate as any, downloadController.createDownload as any);
router.post('/downloads/:id/record', authenticate as any, downloadController.recordDownload as any);
router.put('/downloads/:id', authenticate as any, downloadController.updateDownload as any);
router.delete('/downloads/:id', authenticate as any, downloadController.deleteDownload as any);
router.get('/downloads/history/me', authenticate as any, downloadController.getUserDownloadHistory as any);

export default router;
