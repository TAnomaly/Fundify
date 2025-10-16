import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

// Import controller functions
const createPodcast = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, description, category, language } = req.body;
    const podcast = await require('../utils/prisma').default.podcast.create({
      data: { title, description, category, language, creatorId: userId, coverImage: req.file?.filename || null },
      include: { creator: { select: { id: true, name: true, username: true, avatar: true } } }
    });
    res.status(201).json({ success: true, data: { podcast } });
  } catch (error) { next(error); }
};

const getMyPodcasts = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const podcasts = await require('../utils/prisma').default.podcast.findMany({
      where: { creatorId: userId },
      include: { _count: { select: { episodes: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: { podcasts } });
  } catch (error) { next(error); }
};

const getPodcastsByCreator = async (req: any, res: any, next: any) => {
  try {
    const { creatorId } = req.query;
    const podcasts = await require('../utils/prisma').default.podcast.findMany({
      where: { status: 'PUBLISHED', ...(creatorId && { creatorId: creatorId as string }) },
      include: { creator: { select: { id: true, name: true, avatar: true } }, _count: { select: { episodes: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: { podcasts } });
  } catch (error) { next(error); }
};

const getPodcast = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const podcast = await require('../utils/prisma').default.podcast.findUnique({
      where: { id },
      include: { creator: { select: { id: true, name: true, username: true, avatar: true } }, episodes: { where: { status: 'PUBLISHED' }, orderBy: { episodeNumber: 'asc' } }, _count: { select: { episodes: true } } }
    });
    if (!podcast) {
      res.status(404).json({ success: false, message: 'Podcast not found' });
      return;
    }
    res.json({ success: true, data: { podcast } });
  } catch (error) { next(error); }
};

const createEpisode = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { podcastId } = req.params;
    const { title, description, episodeNumber } = req.body;
    const podcast = await require('../utils/prisma').default.podcast.findFirst({
      where: { id: podcastId, creatorId: userId }
    });
    if (!podcast) {
      res.status(404).json({ success: false, message: 'Podcast not found' });
      return;
    }
    const episode = await require('../utils/prisma').default.podcastEpisode.create({
      data: { title, description, episodeNumber: parseInt(episodeNumber), podcastId, audioUrl: req.file?.filename || null, duration: 0 }
    });
    res.status(201).json({ success: true, data: { episode } });
  } catch (error) { next(error); }
};

const router = Router();

// Create podcast
router.post('/', authenticate, upload.single('coverImage'), createPodcast);

// Get my podcasts
router.get('/my', authenticate, getMyPodcasts);

// Get podcasts by creator
router.get('/', getPodcastsByCreator);

// Get specific podcast
router.get('/:id', getPodcast);

// Create episode
router.post('/:podcastId/episodes', authenticate, upload.single('audio'), createEpisode);

export default router;
