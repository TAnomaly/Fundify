import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import * as goalController from '../controllers/goalController';

const router = Router();

// Public routes
router.get('/goals/creator/:creatorId', optionalAuth as any, goalController.getCreatorGoals as any);
router.get('/goals/:id', optionalAuth as any, goalController.getGoalById as any);

// Protected routes
router.post('/goals', authenticate as any, goalController.createGoal as any);
router.put('/goals/:id', authenticate as any, goalController.updateGoal as any);
router.put('/goals/:id/progress', authenticate as any, goalController.updateGoalProgress as any);
router.delete('/goals/:id', authenticate as any, goalController.deleteGoal as any);

export default router;
