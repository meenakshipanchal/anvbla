#!/usr/bin/env bash
# One-shot bootstrap for a fresh Ubuntu 22.04 / 24.04 Lightsail instance.
# Run once after SSH-ing in:
#   curl -fsSL https://raw.githubusercontent.com/<you>/anvbla/main/deploy/server-bootstrap.sh | bash
# or copy this file to the server and run: bash server-bootstrap.sh
#
# Installs: Node 20 LTS, pm2, nginx, certbot. Then drops you at a clean
# state ready for the first deploy. Idempotent — safe to re-run.

set -euo pipefail

echo "▶ Updating apt and installing base packages..."
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates gnupg git ufw nginx

echo "▶ Installing Node.js 20 LTS..."
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
npm -v

echo "▶ Installing pm2 (process manager)..."
sudo npm install -g pm2

echo "▶ Configuring firewall (UFW)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "▶ Installing certbot for Let's Encrypt SSL..."
sudo apt-get install -y certbot python3-certbot-nginx

echo
echo "✅ Server bootstrap done."
echo
echo "Next steps:"
echo "  1. Clone the repo:    git clone https://github.com/<you>/anvbla.git ~/anvbla"
echo "  2. Copy env:          create ~/anvbla/.env.local with your secrets"
echo "  3. Install + build:   cd ~/anvbla && npm ci && npm run build"
echo "  4. Start with pm2:    pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup"
echo "  5. Nginx + SSL:       see deploy/nginx.conf and run 'sudo certbot --nginx -d yourdomain.com'"
