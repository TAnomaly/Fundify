import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
    createPodcast,
    getMyPodcasts,
    getPodcastsByCreator,
    createEpisode,
    getPodcast,
} from '../controllers/podcastController';

const router = Router();

// Create podcast
router.post('/', authenticate, upload.single('coverImage'), createPodcast as any);

// Get my podcasts
router.get('/my', authenticate, getMyPodcasts as any);

// Get podcasts by creator
router.get('/', getPodcastsByCreator as any);

// Get specific podcast
router.get('/:id', getPodcast as any);

// Create episode
router.post('/:podcastId/episodes', authenticate, upload.single('audio'), createEpisode as any);

export default router;