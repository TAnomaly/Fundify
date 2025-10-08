#!/bin/bash

# Filter deleted creators fix deployment script

cd /home/tugmirk/Desktop/fundify

echo "📝 Staging changes..."
git add -A

echo "💾 Committing changes..."
git commit -m "fix: filter deleted/inactive creators from list

Backend changes:
- Add 'type' parameter support to getAllCampaigns
- Default to showing only ACTIVE campaigns
- Filter by campaign type (CREATOR)

Frontend changes:
- Explicitly request ACTIVE status campaigns
- Add double-check for campaign.status === 'ACTIVE'
- Only show creators with active campaigns

Fixes: Deleted creators still showing in creators list"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Changes pushed! Vercel will auto-deploy frontend."
echo "⚠️  Please manually redeploy backend on Railway if needed."
echo ""
echo "Summary of changes:"
echo "  - Backend now filters out INACTIVE/DELETED campaigns by default"
echo "  - Frontend only requests ACTIVE creator campaigns"
echo "  - Deleted creators will no longer appear in /creators list"
