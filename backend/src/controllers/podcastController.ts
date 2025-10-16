import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { safeCacheGet, safeCacheSet } from '../utils/redis';
import { publishJson } from '../utils/rabbitmq';

// Create podcast
export const createPodcast = async (
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

        const { title, description, category, language } = req.body;
        
        const podcast = await prisma.podcast.create({
            data: {
                title,
                description,
                category,
                language,
                creatorId: userId,
                coverImage: req.file?.filename || null,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                    },
                },
                episodes: {
                    orderBy: { episodeNumber: 'asc' },
                },
            },
        });

        // Invalidate podcasts cache
        await safeCacheSet(`podcasts:creator:${userId}`, null as any, 1);

        // Publish notification
        await publishJson('jobs.podcasts', { 
            type: 'podcast-created', 
            podcastId: podcast.id, 
            creatorId: userId, 
            createdAt: Date.now() 
        });

        res.status(201).json({
            success: true,
            message: 'Podcast created successfully',
            data: { podcast },
        });
    } catch (error) {
        next(error);
    }
};

// Get my podcasts
export const getMyPodcasts = async (
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

        const cacheKey = `podcasts:creator:${userId}`;
        const cached = await safeCacheGet<any[]>(cacheKey);
        if (cached) {
            res.json({ success: true, data: { podcasts: cached } });
            return;
        }

        const podcasts = await prisma.podcast.findMany({
            where: { creatorId: userId },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                    },
                },
                episodes: {
                    orderBy: { episodeNumber: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        episodeNumber: true,
                        duration: true,
                        audioUrl: true,
                        publishedAt: true,
                    },
                },
                _count: {
                    select: {
                        episodes: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Calculate total duration for each podcast
        const podcastsWithDuration = podcasts.map(podcast => {
            const totalDuration = podcast.episodes.reduce((total, episode) => {
                return total + (episode.duration || 0);
            }, 0);
            
            return {
                ...podcast,
                episodeCount: podcast._count.episodes,
                totalDuration: formatDuration(totalDuration),
            };
        });

        await safeCacheSet(cacheKey, podcastsWithDuration, 300); // 5 minutes cache

        res.json({
            success: true,
            data: { podcasts: podcastsWithDuration },
        });
    } catch (error) {
        next(error);
    }
};

// Get podcasts by creator
export const getPodcastsByCreator = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { creatorId } = req.query;
        if (!creatorId) {
            res.status(400).json({ success: false, message: 'Creator ID required' });
            return;
        }

        const cacheKey = `podcasts:creator:${creatorId}`;
        const cached = await safeCacheGet<any[]>(cacheKey);
        if (cached) {
            res.json({ success: true, data: { podcasts: cached } });
            return;
        }

        const podcasts = await prisma.podcast.findMany({
            where: { 
                creatorId: creatorId as string,
                status: 'PUBLISHED'
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                    },
                },
                episodes: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { episodeNumber: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        episodeNumber: true,
                        duration: true,
                        audioUrl: true,
                        publishedAt: true,
                    },
                },
                _count: {
                    select: {
                        episodes: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Calculate total duration for each podcast
        const podcastsWithDuration = podcasts.map(podcast => {
            const totalDuration = podcast.episodes.reduce((total, episode) => {
                return total + (episode.duration || 0);
            }, 0);
            
            return {
                ...podcast,
                episodeCount: podcast._count.episodes,
                totalDuration: formatDuration(totalDuration),
            };
        });

        await safeCacheSet(cacheKey, podcastsWithDuration, 300);

        res.json({
            success: true,
            data: { podcasts: podcastsWithDuration },
        });
    } catch (error) {
        next(error);
    }
};

// Create episode
export const createEpisode = async (
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

        const { podcastId } = req.params;
        const { title, description, duration } = req.body;

        // Check if user owns the podcast
        const podcast = await prisma.podcast.findFirst({
            where: { id: podcastId, creatorId: userId },
        });

        if (!podcast) {
            res.status(404).json({ success: false, message: 'Podcast not found' });
            return;
        }

        // Get next episode number
        const lastEpisode = await prisma.podcastEpisode.findFirst({
            where: { podcastId },
            orderBy: { episodeNumber: 'desc' },
        });

        const episodeNumber = (lastEpisode?.episodeNumber || 0) + 1;

        const episode = await prisma.podcastEpisode.create({
            data: {
                title,
                description,
                episodeNumber,
                duration: parseInt(duration),
                audioUrl: req.file?.filename || null,
                podcastId,
            },
        });

        // Invalidate podcast cache
        await safeCacheSet(`podcasts:creator:${userId}`, null as any, 1);

        res.status(201).json({
            success: true,
            message: 'Episode created successfully',
            data: { episode },
        });
    } catch (error) {
        next(error);
    }
};

// Get podcast with episodes
export const getPodcast = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const podcast = await prisma.podcast.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                    },
                },
                episodes: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { episodeNumber: 'asc' },
                },
                _count: {
                    select: {
                        episodes: true,
                    },
                },
            },
        });

        if (!podcast) {
            res.status(404).json({ success: false, message: 'Podcast not found' });
            return;
        }

        const totalDuration = podcast.episodes.reduce((total, episode) => {
            return total + (episode.duration || 0);
        }, 0);

        const podcastWithDuration = {
            ...podcast,
            episodeCount: podcast._count.episodes,
            totalDuration: formatDuration(totalDuration),
        };

        res.json({
            success: true,
            data: { podcast: podcastWithDuration },
        });
    } catch (error) {
        next(error);
    }
};

// Helper function to format duration
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}