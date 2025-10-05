import { Router } from 'express';
import {
  createWithdrawal,
  getWithdrawals,
  getAllWithdrawals,
  updateWithdrawal,
} from '../controllers/withdrawalController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// POST /api/withdrawals
router.post('/', authenticate, createWithdrawal);

// GET /api/withdrawals/my
router.get('/my', authenticate, getWithdrawals);

// GET /api/withdrawals (admin only)
router.get('/', authenticate, authorize('ADMIN'), getAllWithdrawals);

// PUT /api/withdrawals/:id (admin only)
router.put('/:id', authenticate, authorize('ADMIN'), updateWithdrawal);

export default router;
