import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

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
        const { page = '1', limit = '20', type, status, hostId, upcoming } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const take = parseInt(limit as string);

        const where: any = {
            status: status || 'PUBLISHED',
        };

        if (type) where.type = type;
        if (hostId) where.hostId = hostId;
        if (upcoming === 'true') {
            where.startTime = { gte: new Date() };
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

        res.json({
            success: true,
            data: {
                events,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    pages: Math.ceil(total / take),
                },
            },
        });
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

        // Upsert RSVP
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
            where: {ticketCode},
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

