import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import * as eventController from '../controllers/eventController';

const router = Router();

// Public routes
router.get('/events', eventController.getEvents as any);
router.get('/events/:id', optionalAuth as any, eventController.getEventById as any);
router.get('/events/:id/rsvps', eventController.getEventRSVPs as any);

// Protected routes
router.post('/events', authenticate as any, eventController.createEvent as any);
router.put('/events/:id', authenticate as any, eventController.updateEvent as any);
router.delete('/events/:id', authenticate as any, eventController.deleteEvent as any);
router.post('/events/:id/rsvp', authenticate as any, eventController.rsvpToEvent as any);

// Ticket routes
router.get('/events/:id/ticket', authenticate as any, eventController.getEventTicket as any);
router.post('/events/checkin', authenticate as any, eventController.checkInAttendee as any);
router.get('/events/verify/:ticketCode', eventController.verifyTicket as any);

// Payment routes (for premium events)
router.post('/events/:id/payment-intent', authenticate as any, eventController.createEventPaymentIntent as any);
router.post('/events/:id/complete-rsvp', authenticate as any, eventController.completeEventRSVP as any);

export default router;

