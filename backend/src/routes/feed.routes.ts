import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { getFeed } from '../controllers/feedController';
import { addBookmark, listBookmarks, removeBookmark } from '../controllers/feedInteractionController';

const router = Router();

router.get('/', optionalAuth as any, getFeed as any);
router.get('/bookmarks', authenticate as any, listBookmarks as any);
router.post('/bookmarks', authenticate as any, addBookmark as any);
router.delete('/bookmarks', authenticate as any, removeBookmark as any);

export default router;
