#!/usr/bin/env bash
set -euo pipefail

cd /opt/setia.id
git fetch origin
git checkout main
git reset --hard origin/main
npm install
backend_file=/opt/auroramedia-api/app/server.py
cp -a "$backend_file" "$backend_file.bak-$(date +%Y%m%d%H%M%S)"
cp -a backend/server.py "$backend_file"
VITE_BASE=/ npm run build
cp -a dist/. /var/www/auroramedia-sites/current/
nginx -t
systemctl reload nginx
systemctl restart auroramedia-api.service
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:8000/api/public/portal-ads
