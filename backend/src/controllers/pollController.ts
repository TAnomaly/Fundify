import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

// Create poll
export const createPoll = async (
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

        const {
            question,
            options,
            expiresAt,
            multipleChoice,
            isPublic,
            minimumTierId
        } = req.body;

        if (!question || !options || options.length < 2) {
            res.status(400).json({
                success: false,
                message: 'Question and at least 2 options are required'
            });
            return;
        }

        const poll = await prisma.poll.create({
            data: {
                question,
                options,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                multipleChoice: multipleChoice || false,
                isPublic: isPublic || false,
                minimumTierId,
                creatorId: userId,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Poll created successfully',
            data: poll,
        });
    } catch (error) {
        next(error);
    }
};

// Get all polls for a creator
export const getCreatorPolls = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { creatorId } = req.params;
        const userId = req.user?.id || req.user?.userId;

        const polls = await prisma.poll.findMany({
            where: {
                creatorId,
                isActive: true,
            },
            include: {
                votes: {
                    select: {
                        optionIndex: true,
                        userId: true,
                    },
                },
                _count: {
                    select: {
                        votes: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Calculate vote counts and check if user voted
        const pollsWithStats = polls.map((poll) => {
            const voteCounts: Record<number, number> = {};
            poll.options.forEach((_, index) => {
                voteCounts[index] = poll.votes.filter(
                    (v) => v.optionIndex === index
                ).length;
            });

            const userVote = userId
                ? poll.votes.find((v) => v.userId === userId)
                : null;

            return {
                ...poll,
                voteCounts,
                userVotedIndex: userVote?.optionIndex,
                hasVoted: !!userVote,
                votes: undefined, // Remove raw votes from response
            };
        });

        res.json({
            success: true,
            data: pollsWithStats,
        });
    } catch (error) {
        next(error);
    }
};

// Get single poll with results
export const getPollById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.userId;

        const poll = await prisma.poll.findUnique({
            where: { id },
            include: {
                votes: {
                    select: {
                        optionIndex: true,
                        userId: true,
                        optionText: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!poll) {
            res.status(404).json({ success: false, message: 'Poll not found' });
            return;
        }

        // Calculate results
        const voteCounts: Record<number, number> = {};
        poll.options.forEach((_, index) => {
            voteCounts[index] = poll.votes.filter(
                (v) => v.optionIndex === index
            ).length;
        });

        const userVote = userId
            ? poll.votes.find((v) => v.userId === userId)
            : null;

        const pollWithStats = {
            ...poll,
            voteCounts,
            userVotedIndex: userVote?.optionIndex,
            hasVoted: !!userVote,
            totalVotes: poll.votes.length,
            votes: undefined,
        };

        res.json({
            success: true,
            data: pollWithStats,
        });
    } catch (error) {
        next(error);
    }
};

// Vote on poll
export const voteOnPoll = async (
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

        const { id } = req.params;
        const { optionIndex } = req.body;

        if (optionIndex === undefined || optionIndex === null) {
            res.status(400).json({
                success: false,
                message: 'Option index is required'
            });
            return;
        }

        // Get poll
        const poll = await prisma.poll.findUnique({
            where: { id },
        });

        if (!poll) {
            res.status(404).json({ success: false, message: 'Poll not found' });
            return;
        }

        // Check if poll is active
        if (!poll.isActive) {
            res.status(400).json({ success: false, message: 'Poll is closed' });
            return;
        }

        // Check if poll expired
        if (poll.expiresAt && new Date() > poll.expiresAt) {
            res.status(400).json({ success: false, message: 'Poll has expired' });
            return;
        }

        // Validate option index
        if (optionIndex < 0 || optionIndex >= poll.options.length) {
            res.status(400).json({ success: false, message: 'Invalid option index' });
            return;
        }

        // Check if user already voted
        const existingVote = await prisma.pollVote.findFirst({
            where: {
                pollId: id,
                userId,
            },
        });

        if (existingVote && !poll.multipleChoice) {
            res.status(400).json({
                success: false,
                message: 'You have already voted on this poll'
            });
            return;
        }

        // Create vote
        await prisma.pollVote.create({
            data: {
                pollId: id,
                userId,
                optionIndex,
                optionText: poll.options[optionIndex],
            },
        });

        // Update total votes count
        await prisma.poll.update({
            where: { id },
            data: {
                totalVotes: {
                    increment: 1,
                },
            },
        });

        res.json({
            success: true,
            message: 'Vote recorded successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Delete poll
export const deletePoll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        const poll = await prisma.poll.findUnique({
            where: { id },
        });

        if (!poll) {
            res.status(404).json({ success: false, message: 'Poll not found' });
            return;
        }

        if (poll.creatorId !== userId) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
            return;
        }

        await prisma.poll.delete({
            where: { id },
        });

        res.json({
            success: true,
            message: 'Poll deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Close/deactivate poll
export const closePoll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        const poll = await prisma.poll.findUnique({
            where: { id },
        });

        if (!poll) {
            res.status(404).json({ success: false, message: 'Poll not found' });
            return;
        }

        if (poll.creatorId !== userId) {
            res.status(403).json({ success: false, message: 'Unauthorized' });
            return;
        }

        await prisma.poll.update({
            where: { id },
            data: {
                isActive: false,
            },
        });

        res.json({
            success: true,
            message: 'Poll closed successfully',
        });
    } catch (error) {
        next(error);
    }
};
