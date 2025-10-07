import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
  createCreatorPost,
  getCreatorPosts,
  getCreatorPost,
  updateCreatorPost,
  deleteCreatorPost,
  getMyPosts,
} from '../controllers/creatorPostController';

const router = Router();

// Create a new creator post
router.post('/', authenticate as any, createCreatorPost as any);

// Get user's own posts
router.get('/my-posts', authenticate as any, getMyPosts as any);

// Get all posts from a creator (public + subscriber-only)
router.get('/creator/:creatorId', optionalAuth as any, getCreatorPosts as any);

// Get a single post
router.get('/:postId', optionalAuth as any, getCreatorPost as any);

// Update a creator post
router.put('/:postId', authenticate as any, updateCreatorPost as any);

// Delete a creator post
router.delete('/:postId', authenticate as any, deleteCreatorPost as any);

export default router;
