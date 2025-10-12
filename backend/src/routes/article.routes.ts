import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as articleController from '../controllers/articleController';

const router = Router();

// Public routes
router.get('/articles', articleController.getArticles);
router.get('/articles/:slug', articleController.getArticleBySlug);
router.get('/categories', articleController.getCategories);
router.get('/tags', articleController.getTags);

// Protected routes
router.post('/articles', authenticate as any, articleController.createArticle);
router.put('/articles/:id', authenticate as any, articleController.updateArticle);
router.delete('/articles/:id', authenticate as any, articleController.deleteArticle);
router.post('/articles/:id/like', authenticate as any, articleController.toggleArticleLike);

export default router;

