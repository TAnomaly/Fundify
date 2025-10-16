import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { safeCacheGet, safeCacheSet } from '../utils/redis';
import { publishJson } from '../utils/rabbitmq';

// Create podcast
export const createPodcast = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
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
      },
    });

    // Publish to RabbitMQ for notifications
    await publishJson('jobs.podcast', {
      type: 'PODCAST_CREATED',
      podcastId: podcast.id,
      creatorId: userId,
      title: podcast.title,
    });

    res.status(201).json({
      success: true,
      data: { podcast },
    });
  } catch (error) {
    next(error);
  }
};

// Get podcasts by creator
export const getPodcastsByCreator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { creatorId } = req.query;

    const podcasts = await prisma.podcast.findMany({
      where: {
        status: 'PUBLISHED',
        ...(creatorId && { creatorId: creatorId as string }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            episodes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { podcasts },
    });
  } catch (error) {
    next(error);
  }
};

// Get my podcasts
export const getMyPodcasts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const podcasts = await prisma.podcast.findMany({
      where: { creatorId: userId },
      include: {
        _count: {
          select: {
            episodes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { podcasts },
    });
  } catch (error) {
    next(error);
  }
};

// Get specific podcast
export const getPodcast = async (
  req: Request,
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

// Create episode
export const createEpisode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { podcastId } = req.params;
    const { title, description, episodeNumber } = req.body;

    // Check if podcast exists and belongs to user
    const podcast = await prisma.podcast.findFirst({
      where: { id: podcastId, creatorId: userId },
    });

    if (!podcast) {
      res.status(404).json({ success: false, message: 'Podcast not found' });
      return;
    }

    const episode = await prisma.podcastEpisode.create({
      data: {
        title,
        description,
        episodeNumber: parseInt(episodeNumber),
        podcastId,
        audioUrl: req.file?.filename || null,
        duration: 0, // Will be calculated later
      },
    });

    res.status(201).json({
      success: true,
      data: { episode },
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
