import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as eventController from '../controllers/eventController';

const router = Router();

// Public routes
router.get('/events', eventController.getEvents as any);
router.get('/events/:id', eventController.getEventById as any);
router.get('/events/:id/rsvps', eventController.getEventRSVPs as any);

// Protected routes
router.post('/events', authenticate as any, eventController.createEvent as any);
router.put('/events/:id', authenticate as any, eventController.updateEvent as any);
router.delete('/events/:id', authenticate as any, eventController.deleteEvent as any);
router.post('/events/:id/rsvp', authenticate as any, eventController.rsvpToEvent as any);

export default router;

