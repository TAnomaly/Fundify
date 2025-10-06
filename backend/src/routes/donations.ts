import { Router } from 'express';
import {
  createDonation,
  getDonationsByCampaign,
  getMyDonations,
  getDonationById,
} from '../controllers/donationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/donations
router.post('/', authenticate as any, createDonation as any);

// GET /api/donations/my
router.get('/my', authenticate as any, getMyDonations as any);

// GET /api/donations/:id
router.get('/:id', authenticate as any, getDonationById as any);

// GET /api/donations/campaign/:campaignId
router.get('/campaign/:campaignId', getDonationsByCampaign as any);

export default router;
