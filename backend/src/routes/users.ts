import { Router } from 'express';
import { getUserById, updateUser, getUserCampaigns } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/users/:id
router.get('/:id', getUserById as any);

// PUT /api/users/profile (update current user)
router.put('/profile', authenticate as any, updateUser as any);

// GET /api/users/:id/campaigns
router.get('/:id/campaigns', getUserCampaigns as any);

export default router;
