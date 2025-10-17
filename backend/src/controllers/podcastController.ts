import { Request, Response, NextFunction } from 'express';
import { PodcastStatus, EpisodeStatus } from '@prisma/client';
import prisma from '../utils/prisma';
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

    const {
      title,
      description,
      category,
      language,
      coverImage,
      spotifyShowUrl,
      spotifyShowId,
      externalFeedUrl,
    } = req.body;

    if (!title || !title.trim()) {
      res
        .status(400)
        .json({ success: false, message: 'Podcast title is required' });
      return;
    }

    const rawStatus = req.body.status as PodcastStatus | undefined;
    const isPublicInput = req.body.isPublic;
    const resolvedStatus: PodcastStatus =
      rawStatus ??
      (typeof isPublicInput === 'boolean'
        ? isPublicInput
          ? 'PUBLISHED'
          : 'DRAFT'
        : 'DRAFT');

    const resolvedLanguage = language || 'English';
    const resolvedCategory = category || 'Technology';
    const resolvedCoverImage =
      req.file?.filename ||
      (typeof coverImage === 'string' && coverImage.trim()
        ? coverImage.trim()
        : null);
    const spotifyShowUrlValue =
      typeof spotifyShowUrl === 'string' ? spotifyShowUrl.trim() : '';
    const providedSpotifyShowId =
      typeof spotifyShowId === 'string' ? spotifyShowId.trim() : '';
    const resolvedSpotifyShowId =
      providedSpotifyShowId ||
      (spotifyShowUrlValue
        ? extractSpotifyId(spotifyShowUrlValue, 'show')
        : null);
    const resolvedExternalFeedUrl =
      typeof externalFeedUrl === 'string' ? externalFeedUrl.trim() : '';

    const podcast = await prisma.podcast.create({
      data: {
        title,
        description,
        category: resolvedCategory,
        language: resolvedLanguage,
        creatorId: userId,
        coverImage: resolvedCoverImage,
        spotifyShowUrl: spotifyShowUrlValue || null,
        spotifyShowId: resolvedSpotifyShowId,
        externalFeedUrl: resolvedExternalFeedUrl || null,
        status: resolvedStatus,
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
    const { creatorId, status, includeDrafts } = req.query;
    const userId = (req as any).user?.id || (req as any).user?.userId;

    const requestedStatus = status as PodcastStatus | 'ALL' | undefined;
    const includeDraftsFlag = includeDrafts === 'true';

    const where: Record<string, any> = {
      ...(creatorId && { creatorId: creatorId as string }),
    };

    const isOwner =
      Boolean(creatorId) &&
      Boolean(userId) &&
      (creatorId as string) === userId;

    if (requestedStatus && requestedStatus !== 'ALL') {
      where.status = requestedStatus;
    } else if (!(isOwner && includeDraftsFlag)) {
      where.status = 'PUBLISHED';
    }

    const podcasts = await prisma.podcast.findMany({
      where,
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
    const userId = (req as any).user?.id || (req as any).user?.userId;

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

    const isOwner = userId && podcast.creatorId === userId;

    if (!isOwner && podcast.status !== 'PUBLISHED') {
      res.status(403).json({
        success: false,
        message: 'This podcast is not publicly available',
      });
      return;
    }

    const visibleEpisodes = isOwner
      ? podcast.episodes
      : podcast.episodes.filter((episode) => episode.status === 'PUBLISHED');

    const totalDuration = visibleEpisodes.reduce((total, episode) => {
      return total + (episode.duration || 0);
    }, 0);

    const podcastWithDuration = {
      ...podcast,
      episodes: visibleEpisodes,
      episodeCount: visibleEpisodes.length,
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
    const {
      title,
      description,
      episodeNumber,
      audioUrl: audioUrlFromBody,
      duration,
      status,
      publishedAt,
      spotifyEpisodeUrl: spotifyEpisodeUrlFromBody,
      spotifyEpisodeId,
    } = req.body;

    if (!title || !title.trim()) {
      res
        .status(400)
        .json({ success: false, message: 'Episode title is required' });
      return;
    }

    // Check if podcast exists and belongs to user
    const podcast = await prisma.podcast.findFirst({
      where: { id: podcastId, creatorId: userId },
    });

    if (!podcast) {
      res.status(404).json({ success: false, message: 'Podcast not found' });
      return;
    }

    const numericEpisodeNumber = Number.parseInt(episodeNumber, 10);
    const hasValidEpisodeNumber = !Number.isNaN(numericEpisodeNumber);

    const nextEpisodeNumber =
      hasValidEpisodeNumber
        ? numericEpisodeNumber
        : (await prisma.podcastEpisode.count({
            where: { podcastId },
          })) + 1;

    const isPublicInput = req.body.isPublic;
    const resolvedStatus: EpisodeStatus =
      (status as EpisodeStatus | undefined) ??
      (typeof isPublicInput === 'boolean'
        ? isPublicInput
          ? 'PUBLISHED'
          : 'DRAFT'
        : 'PUBLISHED');

    const resolvedDuration =
      duration !== undefined && !Number.isNaN(Number(duration))
        ? Number(duration)
        : 0;

    const audioUrl =
      req.file?.filename ||
      (typeof audioUrlFromBody === 'string' && audioUrlFromBody.trim()
        ? audioUrlFromBody.trim()
        : null);

    if (!audioUrl) {
      res.status(400).json({
        success: false,
        message: 'Episode audio is required',
      });
      return;
    }

    const spotifyEpisodeUrlValue =
      typeof spotifyEpisodeUrlFromBody === 'string'
        ? spotifyEpisodeUrlFromBody.trim()
        : '';
    const providedSpotifyEpisodeId =
      typeof spotifyEpisodeId === 'string' ? spotifyEpisodeId.trim() : '';
    const resolvedSpotifyEpisodeId =
      providedSpotifyEpisodeId ||
      (spotifyEpisodeUrlValue
        ? extractSpotifyId(spotifyEpisodeUrlValue, 'episode')
        : null);

    const parsedPublishedAt = publishedAt ? new Date(publishedAt) : null;
    const finalPublishedAt =
      resolvedStatus === 'PUBLISHED'
        ? parsedPublishedAt && !Number.isNaN(parsedPublishedAt.getTime())
          ? parsedPublishedAt
          : new Date()
        : null;

    const episode = await prisma.podcastEpisode.create({
      data: {
        title,
        description,
        episodeNumber: nextEpisodeNumber,
        podcastId,
        audioUrl,
        duration: resolvedDuration,
        status: resolvedStatus,
        publishedAt: finalPublishedAt,
        spotifyEpisodeUrl: spotifyEpisodeUrlValue || null,
        spotifyEpisodeId: resolvedSpotifyEpisodeId,
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

// Get podcast episodes (optionally include drafts for creator)
export const getPodcastEpisodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { podcastId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const includeDrafts = req.query.includeDrafts === 'true';

    const podcast = await prisma.podcast.findUnique({
      where: { id: podcastId },
      select: {
        id: true,
        creatorId: true,
      },
    });

    if (!podcast) {
      res
        .status(404)
        .json({ success: false, message: 'Podcast not found' });
      return;
    }

    const isOwner = userId && podcast.creatorId === userId;

    const where: Record<string, any> = { podcastId };
    if (!(isOwner && includeDrafts)) {
      where.status = 'PUBLISHED';
    }

    const episodes = await prisma.podcastEpisode.findMany({
      where,
      orderBy: [{ episodeNumber: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({
      success: true,
      data: { episodes },
    });
  } catch (error) {
    next(error);
  }
};

function extractSpotifyId(
  url: string,
  type: 'show' | 'episode'
): string | null {
  if (!url) {
    return null;
  }

  try {
    if (url.startsWith('spotify:')) {
      const parts = url.split(':').filter(Boolean);
      if (parts.length >= 2) {
        const [entityType, id] = parts.slice(-2);
        if (entityType === type && id) {
          return id;
        }
      }
    }

    const match = url.match(
      /spotify\.com\/(show|episode)\/([A-Za-z0-9]+)(?:\?|$)/
    );
    if (match && match[1] === type) {
      return match[2];
    }
  } catch {
    // Ignore parsing failures and fall through
  }

  return null;
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
