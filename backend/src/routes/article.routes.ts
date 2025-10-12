import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as articleController from '../controllers/articleController';

const router = Router();

// Public routes
router.get('/articles', articleController.getArticles as any);
router.get('/articles/:slug', articleController.getArticleBySlug as any);
router.get('/categories', articleController.getCategories as any);
router.get('/tags', articleController.getTags as any);

// Protected routes
router.post('/articles', authenticate as any, articleController.createArticle as any);
router.put('/articles/:id', authenticate as any, articleController.updateArticle as any);
router.delete('/articles/:id', authenticate as any, articleController.deleteArticle as any);
router.post('/articles/:id/like', authenticate as any, articleController.toggleArticleLike as any);

// Comment routes
router.get('/articles/:id/comments', articleController.getArticleComments as any);
router.post('/articles/:id/comments', authenticate as any, articleController.addArticleComment as any);
router.delete('/articles/:id/comments/:commentId', authenticate as any, articleController.deleteArticleComment as any);

export default router;

