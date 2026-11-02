#!/usr/bin/env bash
set -euo pipefail

cd /opt/setia.id
git fetch origin
git checkout main
git reset --hard origin/main
npm install
VITE_BASE=/ npm run build
sudo systemctl reload nginx
