import { Router } from 'express';
import {
  listReferralCodes,
  createReferralCode,
  updateReferralCode,
  validateReferralCode,
} from '../controllers/referralController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', authenticate as any, listReferralCodes as any);
router.post('/', authenticate as any, createReferralCode as any);
router.patch('/:id', authenticate as any, updateReferralCode as any);
router.get('/validate/:code', optionalAuth as any, validateReferralCode as any);

export default router;
