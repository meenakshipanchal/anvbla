#!/usr/bin/env bash
# Lock down SSH on the Lightsail box. ONLY RUN THIS AFTER:
#   1. You've added your SSH public key via Lightsail console, AND
#   2. You can ssh in with that key (test from another terminal first!)
# Otherwise you'll lock yourself out.
#
# What this does:
#   - PermitRootLogin no             (root SSH disabled — sudo from ubuntu user only)
#   - PasswordAuthentication no      (only SSH keys allowed)
#   - ChallengeResponseAuthentication no
#   - X11Forwarding no
#   - MaxAuthTries 3
#   - ClientAliveInterval 300 + ClientAliveCountMax 2 (kill idle sessions)

set -euo pipefail

CFG=/etc/ssh/sshd_config
BACKUP=/etc/ssh/sshd_config.bak.$(date +%s)

echo "▶ Backing up current sshd_config to $BACKUP"
sudo cp "$CFG" "$BACKUP"

apply() {
  local key="$1" val="$2"
  if sudo grep -qE "^\s*#?\s*${key}\s+" "$CFG"; then
    sudo sed -i "s|^\s*#\?\s*${key}\s\+.*|${key} ${val}|" "$CFG"
  else
    echo "${key} ${val}" | sudo tee -a "$CFG" >/dev/null
  fi
}

apply PermitRootLogin no
apply PasswordAuthentication no
apply ChallengeResponseAuthentication no
apply KbdInteractiveAuthentication no
apply X11Forwarding no
apply MaxAuthTries 3
apply LoginGraceTime 30
apply ClientAliveInterval 300
apply ClientAliveCountMax 2
apply UsePAM yes

echo "▶ Validating sshd config..."
sudo sshd -t

echo "▶ Restarting sshd..."
sudo systemctl restart ssh || sudo systemctl restart sshd

echo
echo "✅ SSH hardened. Open a NEW terminal and try sshing in before closing this one."
echo "   If you get locked out, use the Lightsail browser-based SSH to roll back:"
echo "     sudo cp $BACKUP $CFG && sudo systemctl restart ssh"
