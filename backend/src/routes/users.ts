import { Router } from 'express';
import { getUserById, updateUser, getUserCampaigns } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/users/:id
router.get('/:id', getUserById);

// PUT /api/users/profile (update current user)
router.put('/profile', authenticate, updateUser);

// GET /api/users/:id/campaigns
router.get('/:id/campaigns', getUserCampaigns);

export default router;
