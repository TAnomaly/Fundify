import { Router } from 'express';
import {
  createWelcomeMessage,
  getWelcomeMessages,
  getWelcomeMessage,
  updateWelcomeMessage,
  deleteWelcomeMessage,
  triggerWelcomeMessage,
} from '../controllers/welcomeMessageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/welcome-messages - Create a welcome message
router.post('/', authenticate as any, createWelcomeMessage as any);

// GET /api/welcome-messages - Get all welcome messages for creator
router.get('/', authenticate as any, getWelcomeMessages as any);

// GET /api/welcome-messages/:id - Get a single welcome message
router.get('/:id', authenticate as any, getWelcomeMessage as any);

// PUT /api/welcome-messages/:id - Update a welcome message
router.put('/:id', authenticate as any, updateWelcomeMessage as any);

// DELETE /api/welcome-messages/:id - Delete a welcome message
router.delete('/:id', authenticate as any, deleteWelcomeMessage as any);

// POST /api/welcome-messages/:id/trigger - Trigger welcome message (test)
router.post('/:id/trigger', authenticate as any, triggerWelcomeMessage as any);

export default router;
