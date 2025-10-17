import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getFeed } from '../controllers/feedController';

const router = Router();

router.get('/', authenticate as any, getFeed as any);

export default router;
