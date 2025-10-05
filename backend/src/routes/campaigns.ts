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
router.get('/', getAllCampaigns);

// GET /api/campaigns/my
router.get('/my', authenticate, getMyCampaigns);

// GET /api/campaigns/:slug
router.get('/:slug', getCampaignBySlug);

// POST /api/campaigns
router.post('/', authenticate, createCampaign);

// PUT /api/campaigns/:id
router.put('/:id', authenticate, updateCampaign);

// DELETE /api/campaigns/:id
router.delete('/:id', authenticate, deleteCampaign);

export default router;
