import { Router } from 'express';
import { getMe, getUserById, updateUser, getUserCampaigns, becomeCreator, getCreatorByUsername, getAllCreators } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/users/me (must be before /:id)
router.get('/me', authenticate as any, getMe as any);

// POST /api/users/become-creator
router.post('/become-creator', authenticate as any, becomeCreator as any);

// GET /api/users/creators (public - get all creators)
router.get('/creators', getAllCreators as any);

// GET /api/users/creator/:username (public - get creator profile by username)
router.get('/creator/:username', getCreatorByUsername as any);

// GET /api/users/:id
router.get('/:id', getUserById as any);

// PUT /api/users/profile (update current user)
router.put('/profile', authenticate as any, updateUser as any);

// GET /api/users/:id/campaigns
router.get('/:id/campaigns', getUserCampaigns as any);

export default router;
