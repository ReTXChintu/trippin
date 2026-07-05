# Itinerary Planner — Web

Next.js web application for trip planning, place discovery, and itinerary generation. Serves the web UI and the REST API (`/api/v1`) used by the mobile app.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: MongoDB URI, AUTH_SECRET, ENCRYPTION_SECRET, JWT_SECRET, SMTP, etc.
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 4000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## REST API

Mobile clients use `/api/v1` with JWT Bearer tokens (separate from NextAuth session cookies).

Per-user OpenAI and Google Maps keys are stored encrypted on the User profile; trip operations use the **trip owner's** keys.

Optional: set `NEXT_PUBLIC_MOBILE_APP_DOWNLOAD_URL` in `.env` to show a **Download app** button in the navbar, sidebar, and auth pages.
