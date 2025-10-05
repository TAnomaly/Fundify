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
router.post('/', authenticate, createComment);

// GET /api/comments/campaign/:campaignId
router.get('/campaign/:campaignId', getCommentsByCampaign);

// PUT /api/comments/:id
router.put('/:id', authenticate, updateComment);

// DELETE /api/comments/:id
router.delete('/:id', authenticate, deleteComment);

export default router;
