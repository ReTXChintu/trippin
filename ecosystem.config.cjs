/**
 * PM2 processes for production (the VPS). Ports come from the root .env:
 *   PORT          → the backend API
 *   FRONTEND_PORT → the built frontend (static files, SPA fallback to index.html)
 *
 *   npm run build          # backend bundle + frontend dist
 *   npm run pm2:start      # first start          (pm2:restart / pm2:reload / pm2:stop)
 */
const path = require("node:path");
const { ROOT, readEnv, requirePort } = require("./scripts/read-env.cjs");

const env = readEnv();
const backendPort = requirePort(env, "PORT");
const frontendPort = requirePort(env, "FRONTEND_PORT");
const name = env.PM2_APP_NAME || "trippin";

module.exports = {
  apps: [
    {
      name: `${name}-backend`,
      cwd: ROOT,
      script: path.join(ROOT, "apps/backend/dist/index.js"),
      node_args: "--enable-source-maps",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: String(backendPort),
      },
    },
    {
      name: `${name}-frontend`,
      // PM2's built-in static server.
      script: "serve",
      cwd: ROOT,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      time: true,
      env: {
        PM2_SERVE_PATH: path.join(ROOT, "apps/frontend/dist"),
        PM2_SERVE_PORT: String(frontendPort),
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "/index.html",
      },
    },
  ],
};
