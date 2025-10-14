import { Router } from 'express';
import {
  createPodcast,
  getCreatorPodcasts,
  getPodcast,
  createEpisode,
  getPodcastEpisodes,
  getEpisode,
  trackListen,
  deleteEpisode,
  updateEpisode,
} from '../controllers/podcastController';
import { generateRSSFeed } from '../controllers/rssController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Podcast routes
router.post('/podcasts', authenticate as any, createPodcast as any);
router.get('/podcasts/creator/:creatorId', getCreatorPodcasts as any);
router.get('/podcasts/:id', getPodcast as any);

// Episode routes
router.post('/podcasts/:podcastId/episodes', authenticate as any, createEpisode as any);
router.get('/podcasts/:podcastId/episodes', getPodcastEpisodes as any);
router.get('/episodes/:id', getEpisode as any);
router.put('/episodes/:id', authenticate as any, updateEpisode as any);
router.delete('/episodes/:id', authenticate as any, deleteEpisode as any);

// Listen tracking
router.post('/episodes/:episodeId/listen', authenticate as any, trackListen as any);

// RSS feed
router.get('/podcast/:podcastId/rss', generateRSSFeed as any);

export default router;
