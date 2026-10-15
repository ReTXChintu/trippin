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

# PM2 keeps a process's original script across reloads. The frontend moved from PM2's built-in
# `serve` to scripts/serve-frontend.cjs, so drop a stale definition before reloading.
APP_NAME="$(node -e 'console.log(require("./scripts/read-env.cjs").readEnv().PM2_APP_NAME || "trippin")')"
if pm2 jlist 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const p = JSON.parse(s || "[]").find((x) => x.name === process.argv[1]);
    process.exit(p && !/serve-frontend\.cjs$/.test(p.pm2_env?.pm_exec_path || "") ? 0 : 1);
  });' "$APP_NAME-frontend"; then
  echo "==> Replacing the old $APP_NAME-frontend process"
  pm2 delete "$APP_NAME-frontend"
fi

echo "==> Starting / reloading with PM2"
npm run pm2:reload
pm2 save

echo "==> Health check"
node scripts/healthcheck.cjs

echo "==> Deployed $REF ($(git rev-parse --short HEAD))"
