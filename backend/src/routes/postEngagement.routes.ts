import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  toggleLike,
  getUserLikes,
  addComment,
  getComments,
  deleteComment,
} from '../controllers/postEngagementController';

const router = Router();

// Like routes
router.post('/posts/:postId/like', authenticate as any, toggleLike as any);
router.get('/posts/likes', authenticate as any, getUserLikes as any);

// Comment routes
router.post('/posts/:postId/comments', authenticate as any, addComment as any);
router.get('/posts/:postId/comments', getComments as any);
router.delete('/comments/:commentId', authenticate as any, deleteComment as any);

export default router;

