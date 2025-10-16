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
