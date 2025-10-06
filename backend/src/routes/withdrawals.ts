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
router.post('/', authenticate as any, createWithdrawal as any);

// GET /api/withdrawals/my
router.get('/my', authenticate as any, getWithdrawals as any);

// GET /api/withdrawals (admin only)
router.get('/', authenticate as any, authorize('ADMIN') as any, getAllWithdrawals as any);

// PUT /api/withdrawals/:id (admin only)
router.put('/:id', authenticate as any, authorize('ADMIN') as any, updateWithdrawal as any);

export default router;
