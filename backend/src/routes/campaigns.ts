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

const router = Router();

// GET /api/campaigns
router.get('/', getAllCampaigns as any);

// GET /api/campaigns/my
router.get('/my', authenticate as any, getMyCampaigns as any);

// GET /api/campaigns/:slug
router.get('/:slug', getCampaignBySlug as any);

// POST /api/campaigns
router.post('/', authenticate as any, createCampaign as any);

// PUT /api/campaigns/:id
router.put('/:id', authenticate as any, updateCampaign as any);

// DELETE /api/campaigns/:id
router.delete('/:id', authenticate as any, deleteCampaign as any);

export default router;
