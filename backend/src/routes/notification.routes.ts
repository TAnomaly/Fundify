import { Router } from 'express';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotificationForUser,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate as any, listNotifications as any);
router.post('/mark-all-read', authenticate as any, markAllNotificationsRead as any);
router.post('/:id/read', authenticate as any, markNotificationRead as any);

// Optional helper for testing or manual triggers
router.post('/', authenticate as any, createNotificationForUser as any);

export default router;
