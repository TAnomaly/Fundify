import { Router } from 'express';
import {
  createComment,
  getCommentsByCampaign,
  updateComment,
  deleteComment,
} from '../controllers/commentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/comments
router.post('/', authenticate as any, createComment as any);

// GET /api/comments/campaign/:campaignId
router.get('/campaign/:campaignId', getCommentsByCampaign as any);

// PUT /api/comments/:id
router.put('/:id', authenticate as any, updateComment as any);

// DELETE /api/comments/:id
router.delete('/:id', authenticate as any, deleteComment as any);

export default router;
