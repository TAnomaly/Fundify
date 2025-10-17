import { Router } from 'express';
import { getMe, getUserById, updateUser, getUserCampaigns, becomeCreator, getCreatorByUsername, getAllCreators } from '../controllers/userController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { followUser, unfollowUser, getFollowers, getFollowing } from '../controllers/followController';

const router = Router();

// GET /api/users/me (must be before /:id)
router.get('/me', authenticate as any, getMe as any);

// POST /api/users/become-creator
router.post('/become-creator', authenticate as any, becomeCreator as any);

// GET /api/users/creators (public - get all creators)
router.get('/creators', getAllCreators as any);

// GET /api/users/creator/:username (public - get creator profile by username)
router.get('/creator/:username', optionalAuth as any, getCreatorByUsername as any);

// Follow system
router.get('/:userId/followers', optionalAuth as any, getFollowers as any);
router.get('/:userId/following', optionalAuth as any, getFollowing as any);
router.post('/:userId/follow', authenticate as any, followUser as any);
router.delete('/:userId/follow', authenticate as any, unfollowUser as any);

// GET /api/users/:id
router.get('/:id', getUserById as any);

// PUT /api/users/profile (update current user)
router.put('/profile', authenticate as any, updateUser as any);

// GET /api/users/:id/campaigns
router.get('/:id/campaigns', getUserCampaigns as any);

export default router;
