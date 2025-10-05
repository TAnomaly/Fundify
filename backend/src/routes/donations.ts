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
router.post('/', authenticate, createDonation);

// GET /api/donations/my
router.get('/my', authenticate, getMyDonations);

// GET /api/donations/:id
router.get('/:id', authenticate, getDonationById);

// GET /api/donations/campaign/:campaignId
router.get('/campaign/:campaignId', getDonationsByCampaign);

export default router;
