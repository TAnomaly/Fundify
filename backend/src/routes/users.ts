import { Router } from 'express';
import { getMe, getUserById, updateUser, getUserCampaigns } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/users/me (must be before /:id)
router.get('/me', authenticate as any, getMe as any);

// GET /api/users/:id
router.get('/:id', getUserById as any);

// PUT /api/users/profile (update current user)
router.put('/profile', authenticate as any, updateUser as any);

// GET /api/users/:id/campaigns
router.get('/:id/campaigns', getUserCampaigns as any);

export default router;
