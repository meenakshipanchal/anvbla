#!/usr/bin/env bash
# One-shot bootstrap + HARDENING for a fresh Ubuntu 22.04 / 24.04 Lightsail
# instance. Run once after SSH-ing in:
#
#   bash deploy/server-bootstrap.sh
#
# Installs: Node 20 LTS, pm2, nginx, certbot, fail2ban, ufw,
#           unattended-upgrades (auto security patches).
# Hardens:  UFW (22 + 80 + 443 only), fail2ban (SSH brute-force shield),
#           unattended-upgrades (nightly security patches),
#           sysctl tweaks (SYN flood protection, smaller TIME_WAIT).
# Idempotent — safe to re-run.

set -euo pipefail

echo "▶ Updating apt and installing base packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  curl ca-certificates gnupg git \
  ufw fail2ban unattended-upgrades \
  nginx \
  build-essential

echo "▶ Installing Node.js 20 LTS..."
if ! command -v node >/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
echo "node $(node -v), npm $(npm -v)"

echo "▶ Installing pm2 (process manager)..."
sudo npm install -g pm2

echo "▶ Configuring firewall (UFW): allow SSH + Nginx Full, deny rest..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
yes | sudo ufw enable || true

echo "▶ Installing certbot for Let's Encrypt SSL..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx

echo "▶ Enabling unattended-upgrades (auto security patches nightly)..."
sudo dpkg-reconfigure -plow unattended-upgrades || true
sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "▶ Configuring fail2ban (SSH brute-force shield)..."
sudo tee /etc/fail2ban/jail.local >/dev/null <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
EOF
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo "▶ Applying sysctl hardening (SYN flood, ICMP, source routing)..."
sudo tee /etc/sysctl.d/99-anvbla-hardening.conf >/dev/null <<'EOF'
# Block SYN flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
# Ignore broadcast pings (smurf attack protection)
net.ipv4.icmp_echo_ignore_broadcasts = 1
# Reject bogus ICMP errors
net.ipv4.icmp_ignore_bogus_error_responses = 1
# Don't accept source-routed packets
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
# Don't accept ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
# Log spoofed/martian packets
net.ipv4.conf.all.log_martians = 1
# Increase file descriptor limit (Next.js + many connections)
fs.file-max = 100000
EOF
sudo sysctl --system >/dev/null

echo "▶ Hiding nginx version banner..."
if ! grep -q 'server_tokens off' /etc/nginx/nginx.conf; then
  sudo sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf || true
  if ! grep -q 'server_tokens off' /etc/nginx/nginx.conf; then
    sudo sed -i 's|http {|http {\n\tserver_tokens off;|' /etc/nginx/nginx.conf
  fi
fi

echo
echo "✅ Bootstrap + hardening done."
echo
echo "Next steps:"
echo "  1. Recommended: lock down SSH — run  bash deploy/harden-ssh.sh"
echo "     (disables root login + password auth; make sure your SSH key works first!)"
echo "  2. Clone:    git clone https://github.com/meenakshipanchal/anvbla.git ~/anvbla"
echo "  3. Env:      create ~/anvbla/.env.local with your secrets"
echo "  4. Build:    cd ~/anvbla && npm ci && npm run build"
echo "  5. Start:    pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup"
echo "  6. Nginx:    bash deploy/setup-nginx.sh   # picks an sslip.io hostname for your IP"
