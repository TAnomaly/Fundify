import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { stripe, getOrCreateStripeCustomer, formatAmountForStripe } from '../config/stripe';
import { safeCacheGet, safeCacheSet } from '../utils/redis';
import { publishJson } from '../utils/rabbitmq';

// Create event
export const createEvent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const event = await prisma.event.create({
            data: {
                ...req.body,
                hostId: userId,
            },
            include: {
                host: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        // Invalidate events cache for this host
        await safeCacheSet(`events:list:v1:${userId}`, null as any, 1);

        // Invalidate general events cache
        const redis = await import('../utils/redis');
        const redisClient = await redis.getRedis();
        if (redisClient) {
            // Delete all events cache keys
            const keys = await redisClient.keys('events:*');
            if (keys.length > 0) {
                await redisClient.del(...keys);
                console.log(`[Redis] DELETED ${keys.length} events cache keys`);
            }
        }

        // Publish a notification job (optional)
        await publishJson('jobs.events', { type: 'event-created', eventId: event.id, hostId: userId, createdAt: Date.now() });

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event,
        });
    } catch (error) {
        next(error);
    }
};

// Get all events
export const getEvents = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { page = '1', limit = '20', type, status, hostId, upcoming, past } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const take = parseInt(limit as string);

        const where: any = {
            status: status || 'PUBLISHED',
        };

        if (type) where.type = type;
        if (hostId) where.hostId = hostId;
        
        // Filter by time
        if (upcoming === 'true') {
            where.startTime = { gte: new Date() };
        } else if (past === 'true') {
            where.endTime = { lt: new Date() };
        }

        const cacheKey = `events:query:v1:${JSON.stringify({ page, limit, type, status, hostId, upcoming, past })}`;
        const cached = await safeCacheGet<{ events: any[]; pagination: any }>(cacheKey);
        if (cached) {
            res.json({ success: true, data: cached });
            return;
        }

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where,
                skip,
                take,
                include: {
                    host: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                        },
                    },
                    _count: {
                        select: {
                            rsvps: true,
                        },
                    },
                },
                orderBy: {
                    startTime: 'asc',
                },
            }),
            prisma.event.count({ where }),
        ]);

        const payload = {
            events,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / take),
            },
        };

        await safeCacheSet(cacheKey, payload, 60);

        res.json({ success: true, data: payload });
    } catch (error) {
        next(error);
    }
};

// Get event by ID
export const getEventById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.userId;

        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                host: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        bio: true,
                    },
                },
                _count: {
                    select: {
                        rsvps: true,
                    },
                },
            },
        });

        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }

        // Check user's RSVP status
        let userRSVP = null;
        if (userId) {
            userRSVP = await prisma.eventRSVP.findUnique({
                where: {
                    userId_eventId: {
                        userId,
                        eventId: id,
                    },
                },
            });
        }

        res.json({
            success: true,
            data: {
                ...event,
                userRSVPStatus: userRSVP?.status || null,
                userRSVPIsPaid: userRSVP?.isPaid || false,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Update event
export const updateEvent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        const event = await prisma.event.findUnique({ where: { id } });

        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }

        if (event.hostId !== userId) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const updatedEvent = await prisma.event.update({
            where: { id },
            data: req.body,
        });

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: updatedEvent,
        });
    } catch (error) {
        next(error);
    }
};

// Delete event
export const deleteEvent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        const event = await prisma.event.findUnique({ where: { id } });

        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }

        if (event.hostId !== userId) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
            return;
        }

        await prisma.event.delete({ where: { id } });

        res.json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// RSVP to event
export const rsvpToEvent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { status } = req.body; // GOING, MAYBE, NOT_GOING

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const event = await prisma.event.findUnique({ where: { id } });

        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }

        // Check capacity
        if (status === 'GOING' && event.maxAttendees) {
            const goingCount = await prisma.eventRSVP.count({
                where: {
                    eventId: id,
                    status: 'GOING',
                },
            });

            if (goingCount >= event.maxAttendees) {
                res.status(400).json({
                    success: false,
                    message: 'Event is at full capacity',
                });
                return;
            }
        }

        // If status is NOT_GOING, delete the RSVP instead of updating
        if (status === 'NOT_GOING') {
            await prisma.eventRSVP.deleteMany({
                where: {
                    userId,
                    eventId: id,
                },
            });

            res.json({
                success: true,
                message: 'RSVP cancelled successfully',
                data: null,
            });
            return;
        }

        // Upsert RSVP for GOING or MAYBE
        const rsvp = await prisma.eventRSVP.upsert({
            where: {
                userId_eventId: {
                    userId,
                    eventId: id,
                },
            },
            update: {
                status,
            },
            create: {
                userId,
                eventId: id,
                status,
            },
        });

        res.json({
            success: true,
            message: 'RSVP updated successfully',
            data: rsvp,
        });
    } catch (error) {
        next(error);
    }
};

// Get event RSVPs
export const getEventRSVPs = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.query;

        const where: any = { eventId: id };
        if (status) where.status = status;

        const rsvps = await prisma.eventRSVP.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: rsvps,
        });
    } catch (error) {
        next(error);
    }
};

// Get user's ticket for an event
export const getEventTicket = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const rsvp = await prisma.eventRSVP.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId: id,
                },
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        location: true,
                        virtualLink: true,
                        type: true,
                        coverImage: true,
                        host: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!rsvp || rsvp.status === 'NOT_GOING') {
            res.status(404).json({ success: false, message: 'Ticket not found' });
            return;
        }

        res.json({
            success: true,
            data: rsvp,
        });
    } catch (error) {
        next(error);
    }
};

// Check in attendee with ticket code (for event hosts/staff)
export const checkInAttendee = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { ticketCode } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!ticketCode) {
            res.status(400).json({ success: false, message: 'Ticket code is required' });
            return;
        }

        // Find the RSVP by ticket code
        const rsvp = await prisma.eventRSVP.findUnique({
            where: { ticketCode },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        hostId: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!rsvp) {
            res.status(404).json({ success: false, message: 'Invalid ticket code' });
            return;
        }

        // Check if user is the event host
        if (rsvp.event.hostId !== userId) {
            res.status(403).json({ success: false, message: 'Only event host can check in attendees' });
            return;
        }

        // Check if already checked in
        if (rsvp.checkedIn) {
            res.json({
                success: true,
                alreadyCheckedIn: true,
                message: 'Attendee already checked in',
                data: rsvp,
            });
            return;
        }

        // Check in the attendee
        const updatedRsvp = await prisma.eventRSVP.update({
            where: { id: rsvp.id },
            data: {
                checkedIn: true,
                checkedInAt: new Date(),
                checkedInBy: userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            message: 'Attendee checked in successfully',
            data: updatedRsvp,
        });
    } catch (error) {
        next(error);
    }
};

// Verify ticket code (public endpoint for quick validation)
export const verifyTicket = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { ticketCode } = req.params;

        const rsvp = await prisma.eventRSVP.findUnique({
            where: { ticketCode },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        type: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!rsvp) {
            res.status(404).json({
                success: false,
                valid: false,
                message: 'Invalid ticket code'
            });
            return;
        }

        res.json({
            success: true,
            valid: true,
            data: {
                eventTitle: rsvp.event.title,
                attendeeName: rsvp.user.name,
                checkedIn: rsvp.checkedIn,
                status: rsvp.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Create payment intent for premium event RSVP
export const createEventPaymentIntent = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const userEmail = req.user?.email;
        const userName = (req.user as any)?.name;
        const { id } = req.params;

        if (!userId || !userEmail) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Get event details
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                host: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
            return;
        }

        // Check if event requires payment
        if (!event.isPremium || !event.price || event.price <= 0) {
            res.status(400).json({
                success: false,
                message: 'This event does not require payment',
            });
            return;
        }

        // Check if user already has a paid RSVP
        const existingRsvp = await prisma.eventRSVP.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId: id,
                },
            },
        });

        if (existingRsvp && existingRsvp.isPaid) {
            res.status(400).json({
                success: false,
                message: 'You have already purchased a ticket for this event',
            });
            return;
        }

        // Check capacity
        if (event.maxAttendees) {
            const goingCount = await prisma.eventRSVP.count({
                where: {
                    eventId: id,
                    status: 'GOING',
                },
            });

            if (goingCount >= event.maxAttendees) {
                res.status(400).json({
                    success: false,
                    message: 'Event is at full capacity',
                });
                return;
            }
        }

        // Get or create Stripe customer
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        let stripeCustomerId = user?.stripeCustomerId;

        if (!stripeCustomerId) {
            stripeCustomerId = await getOrCreateStripeCustomer(userId, userEmail, userName);

            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId },
            });
        }

        // Create payment intent
        const amount = formatAmountForStripe(event.price);
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            customer: stripeCustomerId,
            metadata: {
                userId,
                eventId: id,
                eventTitle: event.title,
                hostId: event.hostId,
            },
            description: `Ticket for ${event.title}`,
        });

        res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                amount: event.price,
            },
        });
    } catch (error) {
        console.error('Create event payment intent error:', error);
        next(error);
    }
};

// Complete event RSVP after successful payment
export const completeEventRSVP = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { paymentIntentId } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!paymentIntentId) {
            res.status(400).json({
                success: false,
                message: 'Payment intent ID is required',
            });
            return;
        }

        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            res.status(400).json({
                success: false,
                message: 'Payment has not been completed',
            });
            return;
        }

        // Verify payment intent belongs to this user and event
        if (
            paymentIntent.metadata.userId !== userId ||
            paymentIntent.metadata.eventId !== id
        ) {
            res.status(403).json({
                success: false,
                message: 'Invalid payment verification',
            });
            return;
        }

        // Check if RSVP already exists with this payment
        const existingRsvp = await prisma.eventRSVP.findFirst({
            where: {
                paymentId: paymentIntentId,
            },
        });

        if (existingRsvp) {
            res.json({
                success: true,
                message: 'RSVP already completed',
                data: existingRsvp,
            });
            return;
        }

        // Create or update RSVP with payment information
        const rsvp = await prisma.eventRSVP.upsert({
            where: {
                userId_eventId: {
                    userId,
                    eventId: id,
                },
            },
            update: {
                status: 'GOING',
                isPaid: true,
                paymentId: paymentIntentId,
            },
            create: {
                userId,
                eventId: id,
                status: 'GOING',
                isPaid: true,
                paymentId: paymentIntentId,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        location: true,
                        virtualLink: true,
                        type: true,
                        coverImage: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            message: 'RSVP completed successfully',
            data: rsvp,
        });
    } catch (error) {
        console.error('Complete event RSVP error:', error);
        next(error);
    }
};

