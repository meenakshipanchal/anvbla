#!/usr/bin/env bash
# Wires up nginx for anvbla in one shot:
#   - registers global rate-limit zones (auth + api)
#   - stage 1: install HTTP-only config + reload nginx (so certbot can use
#     the running webserver to prove ownership via /.well-known)
#   - stage 2: run certbot to issue a Let's Encrypt cert
#   - stage 3: swap in the full HTTPS + hardening config + reload
#
# Default hostname is the sslip.io wildcard of this box's public IP so SSL
# works without a paid domain. Override with: HOST=mydomain.com bash setup-nginx.sh

set -euo pipefail

# Force IPv4 detection — Lightsail boxes have an IPv6 address that ifconfig.me
# preferentially returns, which then breaks sslip.io + Let's Encrypt cert
# validation (the cert is requested for the IPv4 hostname). -4 pins curl to v4.
PUBLIC_IP="${PUBLIC_IP:-$(curl -4 -s https://ifconfig.me || curl -4 -s https://api.ipify.org || echo 13.201.32.141)}"
HOST="${HOST:-${PUBLIC_IP}.sslip.io}"

echo "▶ Setting up nginx for $HOST (server IP: $PUBLIC_IP)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

# ── ACME challenge web root ────────────────────────────────────────────────
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html

# ── STAGE 1: HTTP-only config so certbot can authenticate ──────────────────
echo "▶ Stage 1: installing HTTP-only config so certbot can validate..."
sudo cp "$SCRIPT_DIR/nginx-http-only.conf" /etc/nginx/sites-available/anvbla
sudo sed -i "s/YOUR_DOMAIN/$HOST/g" /etc/nginx/sites-available/anvbla
sudo ln -sf /etc/nginx/sites-available/anvbla /etc/nginx/sites-enabled/anvbla
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx

# ── STAGE 2: get the Let's Encrypt cert (certonly: don't touch nginx config) ─
echo "▶ Stage 2: requesting Let's Encrypt cert for $HOST..."
sudo certbot certonly --webroot -w /var/www/html -d "$HOST" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --keep-until-expiring

# ── STAGE 3: swap in the full HTTPS + hardening config ────────────────────
echo "▶ Stage 3: installing full HTTPS config (HTTP/2, HSTS, rate limits, headers)..."
sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/anvbla

# IMPORTANT: uncomment the cert directives BEFORE the YOUR_DOMAIN -> $HOST
# rewrite. Otherwise the comment-stripping pattern still references
# YOUR_DOMAIN but the file already has the real hostname, so the sed becomes
# a no-op and nginx refuses to start with "no ssl_certificate is defined".
sudo sed -i \
  -e "s|^\s*# ssl_certificate     |    ssl_certificate     |" \
  -e "s|^\s*# ssl_certificate_key |    ssl_certificate_key |" \
  /etc/nginx/sites-available/anvbla

sudo sed -i "s/YOUR_DOMAIN/$HOST/g" /etc/nginx/sites-available/anvbla

sudo nginx -t
sudo systemctl reload nginx

# ── Certbot auto-renew via the systemd timer that ships with the package ──
sudo systemctl enable certbot.timer >/dev/null 2>&1 || true
sudo systemctl start certbot.timer  >/dev/null 2>&1 || true

echo
echo "✅ Nginx is up at https://$HOST"
echo "   Test:  curl -I https://$HOST"
echo "   Certs auto-renew via the certbot.timer systemd unit."
