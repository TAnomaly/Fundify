import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

// Create a podcast
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

    const { title, description, coverImage, author, email, category, language, isExplicit, isPublic, minimumTierId } =
      req.body;

    if (!title || !author) {
      res.status(400).json({
        success: false,
        message: 'Title and author are required',
      });
      return;
    }

    const podcast = await prisma.podcast.create({
      data: {
        title,
        description,
        coverImage,
        author,
        email,
        category: category || 'Technology',
        language: language || 'en',
        isExplicit: isExplicit || false,
        isPublic: isPublic !== undefined ? isPublic : true,
        minimumTierId,
        creatorId: userId,
      },
      include: {
        creator: {
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
      message: 'Podcast created successfully',
      data: podcast,
    });
  } catch (error) {
    console.error('Create podcast error:', error);
    next(error);
  }
};

// Get all podcasts for a creator
export const getCreatorPodcasts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { creatorId } = req.params;

    const podcasts = await prisma.podcast.findMany({
      where: { creatorId },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: podcasts,
    });
  } catch (error) {
    console.error('Get creator podcasts error:', error);
    next(error);
  }
};

// Get single podcast
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
            avatar: true,
          },
        },
        episodes: {
          where: { published: true },
          orderBy: { publishedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!podcast) {
      res.status(404).json({ success: false, message: 'Podcast not found' });
      return;
    }

    res.json({
      success: true,
      data: podcast,
    });
  } catch (error) {
    console.error('Get podcast error:', error);
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
    const {
      title,
      description,
      audioUrl,
      duration,
      fileSize,
      episodeNumber,
      season,
      coverImage,
      showNotes,
      timestamps,
      isPublic,
      minimumTierId,
      published,
    } = req.body;

    if (!title || !audioUrl || !duration) {
      res.status(400).json({
        success: false,
        message: 'Title, audioUrl, and duration are required',
      });
      return;
    }

    // Verify podcast ownership
    const podcast = await prisma.podcast.findUnique({
      where: { id: podcastId },
    });

    if (!podcast || podcast.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const episode = await prisma.podcastEpisode.create({
      data: {
        title,
        description,
        audioUrl,
        duration: parseInt(duration),
        fileSize: BigInt(fileSize || 0),
        episodeNumber: episodeNumber ? parseInt(episodeNumber) : null,
        season: season ? parseInt(season) : null,
        coverImage,
        showNotes,
        timestamps,
        isPublic: isPublic !== undefined ? isPublic : true,
        minimumTierId,
        published: published !== undefined ? published : true,
        publishedAt: published !== false ? new Date() : null,
        podcastId,
        creatorId: userId,
      },
      include: {
        podcast: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update podcast episode count
    await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        totalEpisodes: {
          increment: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Episode created successfully',
      data: episode,
    });
  } catch (error) {
    console.error('Create episode error:', error);
    next(error);
  }
};

// Get episodes for a podcast
export const getPodcastEpisodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { podcastId } = req.params;
    const { published } = req.query;

    const where: any = { podcastId };
    if (published !== undefined) {
      where.published = published === 'true';
    }

    const episodes = await prisma.podcastEpisode.findMany({
      where,
      include: {
        podcast: {
          select: {
            id: true,
            title: true,
            coverImage: true,
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
      orderBy: [
        { season: 'desc' },
        { episodeNumber: 'desc' },
        { publishedAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: episodes,
    });
  } catch (error) {
    console.error('Get podcast episodes error:', error);
    next(error);
  }
};

// Get single episode
export const getEpisode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id },
      include: {
        podcast: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!episode) {
      res.status(404).json({ success: false, message: 'Episode not found' });
      return;
    }

    res.json({
      success: true,
      data: episode,
    });
  } catch (error) {
    console.error('Get episode error:', error);
    next(error);
  }
};

// Track episode listen
export const trackListen = async (
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

    const { episodeId } = req.params;
    const { progress, completed } = req.body;

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      res.status(404).json({ success: false, message: 'Episode not found' });
      return;
    }

    // Upsert listen record
    const listen = await prisma.episodeListen.upsert({
      where: {
        userId_episodeId: {
          userId,
          episodeId,
        },
      },
      create: {
        userId,
        episodeId,
        progress: progress || 0,
        completed: completed || false,
      },
      update: {
        progress: progress || 0,
        completed: completed || false,
        listenedAt: new Date(),
      },
    });

    // Increment listen count if first time or just completed
    if (completed && !listen.completed) {
      await prisma.podcastEpisode.update({
        where: { id: episodeId },
        data: {
          listenCount: {
            increment: 1,
          },
        },
      });

      await prisma.podcast.update({
        where: { id: episode.podcastId },
        data: {
          totalListens: {
            increment: 1,
          },
        },
      });
    }

    res.json({
      success: true,
      message: 'Listen tracked',
      data: listen,
    });
  } catch (error) {
    console.error('Track listen error:', error);
    next(error);
  }
};

// Delete episode
export const deleteEpisode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id },
      include: { podcast: true },
    });

    if (!episode) {
      res.status(404).json({ success: false, message: 'Episode not found' });
      return;
    }

    if (episode.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await prisma.podcastEpisode.delete({
      where: { id },
    });

    // Update podcast episode count
    await prisma.podcast.update({
      where: { id: episode.podcastId },
      data: {
        totalEpisodes: {
          decrement: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Episode deleted',
    });
  } catch (error) {
    console.error('Delete episode error:', error);
    next(error);
  }
};

// Update episode
export const updateEpisode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { id } = req.params;

    const episode = await prisma.podcastEpisode.findUnique({
      where: { id },
    });

    if (!episode) {
      res.status(404).json({ success: false, message: 'Episode not found' });
      return;
    }

    if (episode.creatorId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const updated = await prisma.podcastEpisode.update({
      where: { id },
      data: req.body,
      include: {
        podcast: true,
        creator: {
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
      message: 'Episode updated',
      data: updated,
    });
  } catch (error) {
    console.error('Update episode error:', error);
    next(error);
  }
};
