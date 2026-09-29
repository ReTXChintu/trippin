# Itinerary Planner

AI-assisted trip planning: place discovery, drag-and-drop itinerary building, and shareable public trip pages. Monorepo containing the web frontend, the REST API backend, and the Flutter mobile client, all versioned together.

```
apps/
  frontend/    React + Vite + Chakra UI (web app)
  backend/     Node + Express + Mongoose (REST API used by both frontend and mobile)
  mobile-app/  Flutter client
files/         Shared brand assets (logos, icons, brand guidelines)
```

## Setup

```bash
npm install

cp .env.example .env
# Edit .env (single file at the repo root, read by both backend and frontend):
# MONGODB_URI, JWT_SECRET, ENCRYPTION_SECRET, SMTP, FRONTEND_URL, VITE_API_BASE_URL

npm run dev
```

This starts the backend on [http://localhost:4000](http://localhost:4000) and the frontend on [http://localhost:5173](http://localhost:5173).

For the mobile app, see [apps/mobile-app/README.md](apps/mobile-app/README.md) — it talks to the same backend (`API_BASE_URL=http://10.0.2.2:4000/api/v1` on the Android emulator).

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend + frontend dev servers together |
| `npm run dev:backend` / `npm run dev:frontend` | Run one app in isolation |
| `npm run build` | Production build of backend + frontend |
| `npm run release:patch` / `release:minor` / `release:major` | Bump the version across frontend, backend, and mobile-app in one commit + tag |
| `npm run release:dry` | Preview the next release without making changes |
| `npm run pm2:start` / `pm2:restart` / `pm2:stop` | Start, restart (re-reading `.env`) or stop the production processes |
| `npm run pm2:reload` | Start or zero-downtime reload (what a deploy uses) |
| `npm run pm2:status` / `pm2:logs` / `pm2:delete` | Inspect or remove the PM2 processes |
| `npm run deploy -- <tag>` | On the server: check out a tag, install, build, reload, health-check |

## REST API

The backend serves `/api/v1` for both the web frontend and the mobile app. Auth is a single JWT (issued at login): the mobile app receives it in the response body and sends it back as a `Bearer` token; the web frontend receives it as an `httpOnly` cookie sent automatically on subsequent requests.

Per-user OpenAI and Google Maps keys are stored encrypted on the User profile; trip operations use the **trip owner's** keys.

## Versioning

All three apps share one version, controlled from the root via [release-it](https://github.com/release-it/release-it) (`.release-it.json`). A release bump updates `apps/frontend/package.json`, `apps/backend/package.json`, `apps/mobile-app/package.json`, and `apps/mobile-app/pubspec.yaml` together, generates `CHANGELOG.md`, and creates a single commit + tag.

## Deploying to a VPS

Production runs two PM2 processes defined in `ecosystem.config.cjs`, both configured from the root `.env`:

| Process | What | Port |
|---------|------|------|
| `trippin-backend` | The API bundle (`apps/backend/dist/index.js`, `NODE_ENV=production`) | `PORT` |
| `trippin-frontend` | The built frontend (`apps/frontend/dist`), served by PM2 with SPA fallback | `FRONTEND_PORT` |

Put a reverse proxy (nginx, Caddy…) with TLS in front of both ports, and set `FRONTEND_URL`, `BACKEND_URL` and `VITE_API_BASE_URL` in the server's `.env` to the public URLs — the frontend reads `VITE_*` values at build time, so they're baked in on each deploy.

**One-time server setup**

1. Install Node.js (the major version in `.nvmrc`), git and PM2 (`npm install -g pm2`).
2. Clone the repo, e.g. `git clone git@github.com:ReTXChintu/trippin.git /var/www/trippin`, and give the server read access (a deploy key).
3. `cp .env.example .env` and fill it in, including `PORT` and `FRONTEND_PORT`.
4. Run `bash scripts/deploy.sh <tag>` once, then `pm2 startup` so the processes come back after a reboot.

**Automatic deploys** (`.github/workflows/deploy.yml`) run when a `v*` tag is pushed or a GitHub release is published (or manually from the Actions tab with a tag). The workflow builds the project on GitHub first, then SSHes into the server and runs `scripts/deploy.sh <tag>`, which checks out the tag, runs `npm ci` and `npm run build`, reloads PM2 and waits for both health checks. Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Server hostname or IP |
| `VPS_USER` | SSH user that owns the checkout |
| `VPS_SSH_KEY` | Private key for that user (its public key in `~/.ssh/authorized_keys`) |
| `VPS_APP_DIR` | Absolute path of the checkout, e.g. `/var/www/trippin` |
| `VPS_PORT` | SSH port (optional, defaults to 22) |
| `VPS_SSH_PASSPHRASE` | Key passphrase (optional) |

Release flow: `npm run release:patch` (bumps versions, writes the changelog, commits and tags), then `git push --follow-tags` — the tag push deploys it.

