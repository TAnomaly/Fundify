import { Router } from 'express';
import {
  createScheduledPost,
  getScheduledPosts,
  getScheduledPost,
  updateScheduledPost,
  deleteScheduledPost,
  publishScheduledPosts,
} from '../controllers/scheduledPostController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/scheduled-posts - Create a scheduled post
router.post('/', authenticate as any, createScheduledPost as any);

// GET /api/scheduled-posts - Get all scheduled posts for creator
router.get('/', authenticate as any, getScheduledPosts as any);

// POST /api/scheduled-posts/publish - Publish ready scheduled posts (cron job)
router.post('/publish', publishScheduledPosts as any);

// GET /api/scheduled-posts/:id - Get a single scheduled post
router.get('/:id', authenticate as any, getScheduledPost as any);

// PUT /api/scheduled-posts/:id - Update a scheduled post
router.put('/:id', authenticate as any, updateScheduledPost as any);

// DELETE /api/scheduled-posts/:id - Delete a scheduled post
router.delete('/:id', authenticate as any, deleteScheduledPost as any);

export default router;
