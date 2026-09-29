#!/usr/bin/env bash
# Deploys a tag (or any git ref) on the VPS: checkout → install → build → (re)start with PM2 → health check.
# Run from the repo checkout on the server:   bash scripts/deploy.sh v1.2.3
# The GitHub Actions workflow runs exactly this over SSH. The root .env must already exist here.
set -euo pipefail

REF="${1:?usage: deploy.sh <tag-or-ref>}"
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env at $(pwd) — copy .env.example to .env and fill it in first." >&2
  exit 1
fi

echo "==> Fetching $REF"
git fetch --tags --force --prune origin
git checkout --force --detach "$REF"

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Building backend and frontend"
npm run build

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

echo "==> Starting / reloading with PM2"
npm run pm2:reload
pm2 save

echo "==> Health check"
node scripts/healthcheck.cjs

echo "==> Deployed $REF ($(git rev-parse --short HEAD))"
