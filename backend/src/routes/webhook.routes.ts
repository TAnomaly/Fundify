import { Router } from 'express';
import { handleStripeWebhook } from '../controllers/stripeWebhookController';

const router = Router();

// Stripe webhook endpoint
// IMPORTANT: This must be registered with express.raw() body parser
router.post('/stripe', handleStripeWebhook);

export default router;
