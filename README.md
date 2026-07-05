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

cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env: MONGODB_URI, JWT_SECRET, ENCRYPTION_SECRET, SMTP, FRONTEND_URL

cp apps/frontend/.env.example apps/frontend/.env
# Edit apps/frontend/.env: VITE_API_BASE_URL

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

## REST API

The backend serves `/api/v1` for both the web frontend and the mobile app. Auth is a single JWT (issued at login): the mobile app receives it in the response body and sends it back as a `Bearer` token; the web frontend receives it as an `httpOnly` cookie sent automatically on subsequent requests.

Per-user OpenAI and Google Maps keys are stored encrypted on the User profile; trip operations use the **trip owner's** keys.

## Versioning

All three apps share one version, controlled from the root via [release-it](https://github.com/release-it/release-it) (`.release-it.json`). A release bump updates `apps/frontend/package.json`, `apps/backend/package.json`, `apps/mobile-app/package.json`, and `apps/mobile-app/pubspec.yaml` together, generates `CHANGELOG.md`, and creates a single commit + tag.
