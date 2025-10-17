import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createPodcast,
  getPodcastsByCreator,
  getMyPodcasts,
  getPodcast,
  createEpisode,
  getPodcastEpisodes,
} from '../controllers/podcastController';

const router = Router();

router.post(
  '/',
  authenticate as any,
  upload.single('coverImage') as any,
  createPodcast as any
);

router.get('/my', authenticate as any, getMyPodcasts as any);

router.get(
  '/:podcastId/episodes',
  optionalAuth as any,
  getPodcastEpisodes as any
);

router.post(
  '/:podcastId/episodes',
  authenticate as any,
  upload.single('audio') as any,
  createEpisode as any
);

router.get('/', optionalAuth as any, getPodcastsByCreator as any);

router.get('/:id', optionalAuth as any, getPodcast as any);

export default router;
