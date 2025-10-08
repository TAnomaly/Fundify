#!/bin/bash
# Fundify - Quick Fix & Deploy Script

set -e  # Exit on error

echo "🔧 Fundify Quick Fix & Deploy"
echo "================================"
echo ""

# Navigate to project
cd /home/tugmirk/Desktop/fundify

echo "📁 Current directory: $(pwd)"
echo ""

# Check if files exist
echo "✓ Checking UI components..."
if [ -f "frontend/components/ui/textarea.tsx" ]; then
    echo "  ✓ textarea.tsx EXISTS"
else
    echo "  ✗ textarea.tsx MISSING!"
    exit 1
fi

if [ -f "frontend/components/ui/label.tsx" ]; then
    echo "  ✓ label.tsx EXISTS"
else
    echo "  ✗ label.tsx MISSING!"
    exit 1
fi

if [ -f "frontend/components/ui/switch.tsx" ]; then
    echo "  ✓ switch.tsx EXISTS"
else
    echo "  ✗ switch.tsx MISSING!"
    exit 1
fi

echo ""
echo "📦 Git Status:"
git status --short

echo ""
echo "➕ Adding files to git..."
git add frontend/components/ui/textarea.tsx
git add frontend/components/ui/label.tsx
git add frontend/components/ui/switch.tsx
git add frontend/next.config.ts
git add frontend/package.json
git add frontend/package-lock.json

echo ""
echo "📝 Creating commit..."
git commit -m "feat: add missing UI components (textarea, label, switch) - fix deployment" || echo "Nothing to commit or already committed"

echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DONE! Check Vercel dashboard:"
echo "   https://vercel.com/dashboard"
echo ""
echo "📊 Last 3 commits:"
git log --oneline -3

echo ""
echo "🎯 Deployment should start automatically in Vercel"
echo "   Wait 2-3 minutes and check deployment status"

