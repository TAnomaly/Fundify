import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as eventController from '../controllers/eventController';

const router = Router();

// Public routes
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEventById);
router.get('/events/:id/rsvps', eventController.getEventRSVPs);

// Protected routes
router.post('/events', authenticate as any, eventController.createEvent);
router.put('/events/:id', authenticate as any, eventController.updateEvent);
router.delete('/events/:id', authenticate as any, eventController.deleteEvent);
router.post('/events/:id/rsvp', authenticate as any, eventController.rsvpToEvent);

export default router;

