import { Router } from 'express';
import {
  getAllCampaigns,
  getCampaignBySlug,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getMyCampaigns,
} from '../controllers/campaignController';
import { authenticate } from '../middleware/auth';
import { createCampaignLimiter, readLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/campaigns - with lenient rate limit
router.get('/', readLimiter, getAllCampaigns as any);

// GET /api/campaigns/my
router.get('/my', authenticate as any, getMyCampaigns as any);

// GET /api/campaigns/:slug - with lenient rate limit
router.get('/:slug', readLimiter, getCampaignBySlug as any);

// POST /api/campaigns - with strict rate limiting
router.post('/', authenticate as any, createCampaignLimiter, createCampaign as any);

// PUT /api/campaigns/:id
router.put('/:id', authenticate as any, updateCampaign as any);

// DELETE /api/campaigns/:id
router.delete('/:id', authenticate as any, deleteCampaign as any);

export default router;
