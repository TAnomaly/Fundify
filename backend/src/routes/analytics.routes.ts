import { Router } from 'express';
import {
  getAnalytics,
  getSubscribers,
  sendBulkMessage,
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/analytics - Get creator analytics dashboard
router.get('/', authenticate as any, getAnalytics as any);

// GET /api/analytics/subscribers - Get subscriber list with filters
router.get('/subscribers', authenticate as any, getSubscribers as any);

// POST /api/analytics/bulk-message - Send bulk message to subscribers
router.post('/bulk-message', authenticate as any, sendBulkMessage as any);

export default router;
