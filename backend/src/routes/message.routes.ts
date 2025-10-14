import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as messageController from '../controllers/messageController';

const router = Router();

// All routes are protected (require authentication)
router.post('/messages', authenticate as any, messageController.sendMessage as any);
router.get('/messages/conversations', authenticate as any, messageController.getUserConversations as any);
router.get('/messages/conversation/:otherUserId', authenticate as any, messageController.getConversation as any);
router.get('/messages/broadcasts/:creatorId', authenticate as any, messageController.getBroadcastMessages as any);
router.put('/messages/:messageId/read', authenticate as any, messageController.markMessageAsRead as any);
router.delete('/messages/:messageId', authenticate as any, messageController.deleteMessage as any);
router.get('/messages/unread/count', authenticate as any, messageController.getUnreadCount as any);

export default router;
