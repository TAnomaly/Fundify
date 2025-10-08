import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createCheckoutSession,
  createPortalSession,
  getStripeConfig,
} from '../controllers/stripeController';

const router = Router();

// Get Stripe publishable key (public)
router.get('/config', getStripeConfig as any);

// Create Stripe Checkout session for subscription (protected)
router.post('/create-checkout-session', authenticate as any, createCheckoutSession as any);

// Create Stripe Customer Portal session (protected)
router.post('/create-portal-session', authenticate as any, createPortalSession as any);

export default router;
