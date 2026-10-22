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
      // Our own small static server (SPA fallback, right content types — PM2's `serve` made
      // browsers save trippin.apk as a .zip).
      script: path.join(ROOT, "scripts/serve-frontend.cjs"),
      cwd: ROOT,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      time: true,
      env: {
        NODE_ENV: "production",
        FRONTEND_DIST: path.join(ROOT, "apps/frontend/dist"),
        FRONTEND_PORT: String(frontendPort),
        // HTTPS when a certificate is configured (the backend reads these from .env itself).
        SSL_CERT_PATH: env.SSL_CERT_PATH || "",
        SSL_KEY_PATH: env.SSL_KEY_PATH || "",
        // /api/* on the frontend port goes to the backend on this machine (same scheme as it serves).
        BACKEND_INTERNAL_URL:
          env.BACKEND_INTERNAL_URL || `${env.SSL_CERT_PATH && env.SSL_KEY_PATH ? "https" : "http"}://127.0.0.1:${backendPort}`,
      },
    },
  ],
};
