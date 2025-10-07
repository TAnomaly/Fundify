import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createMembershipTier,
  getCampaignTiers,
  updateMembershipTier,
  deleteMembershipTier,
} from '../controllers/membershipTierController';

const router = Router();

// Create a membership tier for a campaign
router.post('/campaigns/:campaignId/tiers', authenticate as any, createMembershipTier as any);

// Get all tiers for a campaign
router.get('/campaigns/:campaignId/tiers', getCampaignTiers as any);

// Update a membership tier
router.put('/tiers/:tierId', authenticate as any, updateMembershipTier as any);

// Delete a membership tier
router.delete('/tiers/:tierId', authenticate as any, deleteMembershipTier as any);

export default router;
