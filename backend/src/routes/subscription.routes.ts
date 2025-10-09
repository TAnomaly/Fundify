import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createSubscription,
  getMySubscriptions,
  getMySubscribers,
  cancelSubscription,
  toggleSubscriptionPause,
  getRecentSubscriptions,
} from '../controllers/subscriptionController';

const router = Router();

// Subscribe to a membership tier
router.post('/', authenticate as any, createSubscription as any);

// Get user's subscriptions
router.get('/my-subscriptions', authenticate as any, getMySubscriptions as any);

// Get creator's subscribers
router.get('/my-subscribers', authenticate as any, getMySubscribers as any);

// Get recent subscriptions (for stream widgets)
router.get('/recent', getRecentSubscriptions as any);

// Cancel a subscription
router.post('/:subscriptionId/cancel', authenticate as any, cancelSubscription as any);

// Pause/Resume a subscription
router.post('/:subscriptionId/toggle-pause', authenticate as any, toggleSubscriptionPause as any);

export default router;
