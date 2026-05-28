#!/usr/bin/env bash
# Wires up nginx for anvbla in one shot:
#   - registers global rate-limit zones (auth + api)
#   - installs the site config with your real hostname substituted
#   - links it + removes the default
#   - reloads nginx
#   - runs certbot for Let's Encrypt SSL (auto-renews via systemd timer)
#
# Default hostname is the sslip.io wildcard of this box's public IP so SSL
# works without a paid domain. Override with: HOST=mydomain.com bash setup-nginx.sh

set -euo pipefail

PUBLIC_IP="${PUBLIC_IP:-$(curl -s ifconfig.me || echo 13.201.32.141)}"
HOST="${HOST:-${PUBLIC_IP}.sslip.io}"

echo "▶ Setting up nginx for $HOST (server IP: $PUBLIC_IP)"

# ── Global rate-limit zones (idempotent) ───────────────────────────────────
ZONES=/etc/nginx/conf.d/anvbla-zones.conf
sudo tee "$ZONES" >/dev/null <<'EOF'
# Rate limit zones for anvbla. Defined once globally; per-location limits
# live in sites-available/anvbla.
#   auth: 10 req/sec per IP — token endpoints, session creation
#   api:  30 req/sec per IP — everything else under /api
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m  rate=30r/s;
EOF

# ── Site config ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/anvbla
sudo sed -i "s/YOUR_DOMAIN/$HOST/g" /etc/nginx/sites-available/anvbla
sudo ln -sf /etc/nginx/sites-available/anvbla /etc/nginx/sites-enabled/anvbla
sudo rm -f /etc/nginx/sites-enabled/default

echo "▶ nginx -t (syntax check)..."
sudo nginx -t

echo "▶ Reloading nginx (HTTP only, pre-cert)..."
sudo systemctl reload nginx

echo "▶ Requesting SSL cert via certbot..."
# --redirect makes certbot auto-add the HTTP→HTTPS redirect block (we have
# our own but this also handles edge cases). --keep keeps existing certs.
sudo certbot --nginx -d "$HOST" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --redirect --keep-until-expiring

echo
echo "✅ Nginx is up at https://$HOST"
echo "   Test:  curl -I https://$HOST"
echo "   Certs auto-renew via the certbot.timer systemd unit."
