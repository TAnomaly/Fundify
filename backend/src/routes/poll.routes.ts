import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import * as pollController from '../controllers/pollController';

const router = Router();

// Public routes
router.get('/polls/creator/:creatorId', optionalAuth as any, pollController.getCreatorPolls as any);
router.get('/polls/:id', optionalAuth as any, pollController.getPollById as any);

// Protected routes
router.post('/polls', authenticate as any, pollController.createPoll as any);
router.post('/polls/:id/vote', authenticate as any, pollController.voteOnPoll as any);
router.delete('/polls/:id', authenticate as any, pollController.deletePoll as any);
router.put('/polls/:id/close', authenticate as any, pollController.closePoll as any);

export default router;
