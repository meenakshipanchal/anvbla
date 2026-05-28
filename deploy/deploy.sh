#!/usr/bin/env bash
# Re-deploy on the server. Run after pushing new code:
#   ssh ubuntu@<lightsail-ip>
#   cd ~/anvbla && bash deploy/deploy.sh
#
# Pulls latest main, reinstalls deps if needed, rebuilds, restarts pm2.
# Safe to re-run.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "▶ Pulling latest..."
git fetch --prune
git reset --hard origin/main

echo "▶ Installing deps (npm ci)..."
npm ci

echo "▶ Building (next build)..."
npm run build

echo "▶ Restarting pm2 process..."
if pm2 describe anvbla >/dev/null 2>&1; then
  pm2 reload anvbla --update-env
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

pm2 status anvbla
echo
echo "✅ Deploy complete."
