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

The backend serves `/api/v1` for both the web frontend and the mobile app.

**Sign-in is single sign-on only**, through the OpenID Connect identity server shared with SpendLog and InFrame (`OIDC_ISSUER`). Trippin has no passwords, sign-up or password reset of its own.

- **Web:** `GET /api/v1/auth/oidc/start?returnTo=/path` sends the browser to the identity server (authorization code + PKCE, state and nonce in a short-lived signed cookie); `GET /api/v1/auth/oidc/callback` checks them, verifies the ID token, finds or creates the local user and sets Trippin's `access_token` cookie, then redirects to `FRONTEND_URL` + `returnTo`. Register `OIDC_REDIRECT_URI` (= `BACKEND_URL/api/v1/auth/oidc/callback`) for the `trippin-web` client.
- **Mobile:** the app signs in with `flutter_appauth` (public client `trippin-mobile`) and posts the ID token to `POST /api/v1/auth/oidc/mobile`, which returns `{ accessToken, user }`.
- **Sign-out:** `POST /api/v1/auth/logout` clears the cookie and returns the identity server's `endSessionUrl` (`GET` redirects there).

A sign-in is matched to a Trippin user by the identity server's `sub`, else by email (only when the email is verified), else a new user is created — user ids never change. Trippin's own token is a JWT: the mobile app receives it in the response body and sends it back as a `Bearer` token; the web frontend receives it as an `httpOnly` cookie sent automatically on subsequent requests.

Adding a trip member by email works for people who haven't used Trippin yet: they get an email, and the invite is claimed when they first sign in with that (verified) address.

Per-user OpenAI and Google Maps keys are stored encrypted on the User profile; trip operations use the **trip owner's** keys.

## Versioning

All three apps share one version, controlled from the root via [release-it](https://github.com/release-it/release-it) (`.release-it.json`). A release bump updates `apps/frontend/package.json`, `apps/backend/package.json`, `apps/mobile-app/package.json`, and `apps/mobile-app/pubspec.yaml` together, generates `CHANGELOG.md`, and creates a single commit + tag.

## Deploying to a VPS

Production runs two PM2 processes defined in `ecosystem.config.cjs`, both configured from the root `.env`:

| Process | What | Port |
|---------|------|------|
| `trippin-backend` | The API bundle (`apps/backend/dist/index.js`, `NODE_ENV=production`) | `PORT` |
| `trippin-frontend` | The built frontend (`apps/frontend/dist`), served by `scripts/serve-frontend.cjs` (SPA fallback, APK download headers) | `FRONTEND_PORT` |

Production must be HTTPS on a hostname (e.g. a duckdns subdomain) — the identity server, secure cookies and Android all need it. Either set `SSL_CERT_PATH` / `SSL_KEY_PATH` (both processes then serve HTTPS themselves), or put a reverse proxy (nginx, Caddy…) with TLS in front of both ports. Set `FRONTEND_URL`, `BACKEND_URL`, `VITE_API_BASE_URL`, `OIDC_REDIRECT_URI` and `OIDC_POST_LOGOUT_URI` in the server's `.env` to the public `https://` URLs — the frontend reads `VITE_*` values at build time, so they're baked in on each deploy. The browser talks to the backend's port directly, so the sign-in callback is on the backend: `https://<name>.duckdns.org:<PORT>/api/v1/auth/oidc/callback`.

**One-time server setup**

1. Install Node.js (the major version in `.nvmrc`), git and PM2 (`npm install -g pm2`).
2. Clone the repo, e.g. `git clone git@github.com:ReTXChintu/trippin.git /opt/var/trippin`, and give the server read access (a deploy key).
3. `cp .env.example .env` and fill it in, including `PORT` and `FRONTEND_PORT`.
4. Run `bash scripts/deploy.sh <tag>` once, then `pm2 startup` so the processes come back after a reboot.

**Releases** (`.github/workflows/deploy.yml`) run when a GitHub release is published (or by hand from the Actions tab with a tag). The workflow:

1. checks the web build and builds the signed Android APK (version = the tag, build number = the run number),
2. copies `trippin.apk` and `trippin-apk.json` (the version the app checks for updates) to `apps/frontend/public` on the server — both are git-ignored, so they survive the checkout and are served at `<website>/trippin.apk`,
3. SSHes in, checks out the release tag and runs `scripts/deploy.sh <tag>`: `npm ci`, `npm run build` (which copies the APK into the frontend's `dist`), PM2 reload, health checks.

The app shows its version in Settings and offers **Update** when a newer `trippin-apk.json` is on the server. Android asks once to allow installs from the browser.

Add in Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Server hostname or IP |
| `VPS_USER` | SSH user that owns the checkout |
| `VPS_SSH_KEY` | Private key for that user (its public key in `~/.ssh/authorized_keys`) |
| `VPS_PORT` | SSH port (optional, defaults to 22) |
| `VPS_SSH_PASSPHRASE` | Key passphrase (optional) |
| `ANDROID_KEYSTORE_BASE64` | The app's signing keystore, base64 (`base64 -w0 trippin-upload.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` | Its passwords and alias |

| Variable | Value |
|----------|-------|
| `VPS_APP_DIR` | Checkout on the server (optional, default `/opt/var/trippin`) |
| `MOBILE_API_BASE_URL` | API the app talks to, e.g. `https://<name>.duckdns.org:50008/api/v1` |
| `MOBILE_WEB_URL` | The website, e.g. `https://<name>.duckdns.org:50009` — also where the app looks for updates |
| `MOBILE_OIDC_ISSUER` | The identity server the app signs in with, e.g. `https://id-x.duckdns.org:50011` (required) |
| `MOBILE_MAP_TILE_URL` | Map tiles (optional, defaults to OpenStreetMap) |
| `FLUTTER_VERSION` | Optional, defaults to 3.47.2 |

Create the signing key once and keep it safe — every release must be signed with it, or phones refuse the update:

```bash
keytool -genkey -v -keystore trippin-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias trippin
```

Release flow: `npm run release:patch` (bumps versions, writes the changelog, commits and tags), `git push --follow-tags`, then publish a GitHub release for the tag — that runs the pipeline.

