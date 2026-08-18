#!/bin/bash
# Auto-deploy WhatsApp service using Railway CLI
# Requires: railway CLI installed + logged in (railway login)

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🚂 Deploying WhatsApp Service to Railway                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check Railway CLI
if ! command -v railway >/dev/null 2>&1; then
  echo "❌ Railway CLI not installed."
  echo "Install: npm install -g @railway/cli"
  exit 1
fi

# Check login status
if ! railway whoami >/dev/null 2>&1; then
  echo "❌ Not logged in to Railway."
  echo "Run: railway login"
  exit 1
fi

# Link or create project
if [ ! -f .railway/project.json ]; then
  echo "✓ Creating Railway project..."
  railway init --name work2u-whatsapp-service
fi

# Add environment variables from .env file
echo "✓ Setting environment variables..."
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Set variable
    railway variables set "$key=$value"
    echo "  ✓ Set $key"
  done < .env
fi

# Deploy
echo ""
echo "✓ Deploying..."
railway up --detach

# Get URL
sleep 5
echo ""
echo "✓ Getting public URL..."
URL=$(railway domain 2>/dev/null || echo "")

if [ -n "$URL" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  ✅ Deployment Complete!                                 ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  echo "🌐 Service URL: https://$URL"
  echo ""
  echo "Next: Configure dashboard dengan URL ni + API_KEY"
else
  echo ""
  echo "⚠️  Auto URL fetch failed. Get URL manually:"
  echo "   railway domain"
fi
