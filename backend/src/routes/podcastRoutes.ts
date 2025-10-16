import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import prisma from '../utils/prisma';

const router = Router();

// Create podcast
router.post('/', authenticate as any, upload.single('coverImage') as any, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { title, description, category, language } = req.body;
    const podcast = await prisma.podcast.create({
      data: { title, description, category, language, creatorId: userId, coverImage: req.file?.filename || null },
      include: { creator: { select: { id: true, name: true, username: true, avatar: true } } }
    });
    res.status(201).json({ success: true, data: { podcast } });
  } catch (error) { next(error); }
});

// Get my podcasts
router.get('/my', authenticate as any, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const podcasts = await prisma.podcast.findMany({
      where: { creatorId: userId },
      include: { _count: { select: { episodes: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: { podcasts } });
  } catch (error) { next(error); }
});

// Get podcasts by creator
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const { creatorId } = req.query;
    const podcasts = await prisma.podcast.findMany({
      where: { status: 'PUBLISHED', ...(creatorId && { creatorId: creatorId as string }) },
      include: { creator: { select: { id: true, name: true, avatar: true } }, _count: { select: { episodes: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: { podcasts } });
  } catch (error) { next(error); }
});

// Get specific podcast
router.get('/:id', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const podcast = await prisma.podcast.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, username: true, avatar: true } },
        episodes: { where: { status: 'PUBLISHED' }, orderBy: { episodeNumber: 'asc' } },
        _count: { select: { episodes: true } }
      }
    });
    if (!podcast) {
      return res.status(404).json({ success: false, message: 'Podcast not found' });
    }
    res.json({ success: true, data: { podcast } });
  } catch (error) { next(error); }
});

// Create episode
router.post('/:podcastId/episodes', authenticate as any, upload.single('audio') as any, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { podcastId } = req.params;
    const { title, description, episodeNumber } = req.body;
    const podcast = await prisma.podcast.findFirst({ where: { id: podcastId, creatorId: userId } });
    if (!podcast) {
      return res.status(404).json({ success: false, message: 'Podcast not found' });
    }
    const episode = await prisma.podcastEpisode.create({
      data: { title, description, episodeNumber: parseInt(episodeNumber), podcastId, audioUrl: req.file?.filename || null, duration: 0 }
    });
    res.status(201).json({ success: true, data: { episode } });
  } catch (error) { next(error); }
});

export default router;