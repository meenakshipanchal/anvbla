#!/usr/bin/env bash
# One command, top-to-bottom install on a fresh Ubuntu 22/24 Lightsail box.
# Runs: server bootstrap → clone repo → pause for .env.local → npm ci →
# build → pm2 start → nginx + Let's Encrypt SSL.
#
# Run as the `ubuntu` user (NOT root):
#   curl -fsSL https://raw.githubusercontent.com/meenakshipanchal/anvbla/main/deploy/install-all.sh | bash
#
# Override the hostname certbot uses (defaults to <public-ip>.sslip.io):
#   HOST=mydomain.com bash <(curl -fsSL https://raw.githubusercontent.com/meenakshipanchal/anvbla/main/deploy/install-all.sh)

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/meenakshipanchal/anvbla.git}"
APP_DIR="${APP_DIR:-$HOME/anvbla}"

banner() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()     { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn()   { printf '\033[1;33m! %s\033[0m\n' "$*"; }

# ── 1. Bootstrap the server (Node, pm2, nginx, certbot, hardening) ─────────
banner "Step 1/5 — bootstrapping server (Node 20, pm2, nginx, certbot, fail2ban, sysctl, UFW)"
if [[ ! -d "$APP_DIR" ]]; then
  sudo apt-get update -y
  sudo apt-get install -y git
  git clone "$REPO_URL" "$APP_DIR"
fi
bash "$APP_DIR/deploy/server-bootstrap.sh"
ok "Server bootstrap done."

# ── 2. .env.local — pause for the user to drop in their secrets ────────────
banner "Step 2/5 — .env.local"
ENV_FILE="$APP_DIR/.env.local"
if [[ -f "$ENV_FILE" && -s "$ENV_FILE" ]]; then
  ok ".env.local already exists at $ENV_FILE — skipping prompt."
else
  cat <<'PROMPT'

🔑 Open a NEW terminal tab and edit the env file on this box:

       nano ~/anvbla/.env.local

   Paste your secrets (same values you had on Vercel). Required keys:

       NEXT_PUBLIC_FIREBASE_API_KEY=...
       NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cr-eb178.firebaseapp.com
       NEXT_PUBLIC_FIREBASE_PROJECT_ID=cr-eb178
       NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cr-eb178.firebasestorage.app
       NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1004665759126
       NEXT_PUBLIC_FIREBASE_APP_ID=...
       NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4S7ZT45Z2F
       NEXT_PUBLIC_GOOGLE_CLIENT_ID=1004665759126-btrrsl016anos2ri06i56dlsc303n16b.apps.googleusercontent.com
       FIREBASE_PROJECT_ID=cr-eb178
       FIREBASE_CLIENT_EMAIL=<from Vercel — looks like firebase-adminsdk-...@cr-eb178.iam.gserviceaccount.com>
       FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
       GEOAPIFY_API_KEY=d4bd20ae2295439cb2e80fa520f427a5

   Save (Ctrl+O, Enter, Ctrl+X), then press Enter HERE to continue.

PROMPT
  read -r -p "Press Enter once .env.local is saved... " _
  if [[ ! -s "$ENV_FILE" ]]; then
    echo "✗ $ENV_FILE is missing or empty. Aborting." >&2
    exit 1
  fi
fi
chmod 600 "$ENV_FILE"
ok "Locked down $ENV_FILE (chmod 600)."

# ── 3. Install + build ─────────────────────────────────────────────────────
banner "Step 3/5 — npm ci + next build (this takes a few minutes)"
cd "$APP_DIR"
npm ci
npm run build
ok "Build done."

# ── 4. Start with pm2 ──────────────────────────────────────────────────────
banner "Step 4/5 — starting with pm2 (cluster mode, 2 workers)"
if pm2 describe anvbla >/dev/null 2>&1; then
  pm2 reload anvbla --update-env
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi
PM2_STARTUP_CMD=$(pm2 startup systemd -u "$USER" --hp "$HOME" 2>&1 | grep -E '^sudo ' | tail -n 1 || true)
if [[ -n "$PM2_STARTUP_CMD" ]]; then
  warn "Run this ONE command to make pm2 start on reboot:"
  echo "    $PM2_STARTUP_CMD"
fi
ok "App is running on http://127.0.0.1:3000"

# ── 5. Nginx + Let's Encrypt SSL ───────────────────────────────────────────
banner "Step 5/5 — nginx + SSL"
bash "$APP_DIR/deploy/setup-nginx.sh"

PUBLIC_IP="${PUBLIC_IP:-$(curl -s ifconfig.me || true)}"
HOST_USED="${HOST:-${PUBLIC_IP}.sslip.io}"
echo
ok "DONE. Site is live at https://$HOST_USED"
echo
warn "Remember to add this origin in Google Cloud Console → OAuth client →"
warn "  Authorized JavaScript origins:  https://$HOST_USED"
warn "Otherwise One Tap will throw origin_mismatch on sign-in."
