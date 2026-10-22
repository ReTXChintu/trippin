/**
 * Serves the built frontend (apps/frontend/dist) in production — what the trippin-frontend PM2
 * process runs. Replaces PM2's built-in `serve`, which sent trippin.apk with a zip content type so
 * browsers saved it as "trippin.apk.zip".
 *
 *   - SPA: a path with no file extension gets index.html (client-side routing).
 *   - A missing file WITH an extension is a real 404 (so /trippin.apk is never index.html in disguise).
 *   - .apk: the Android package type + "download as trippin.apk".
 *   - trippin-apk.json and index.html: never cached, so a new release shows up at once.
 *   - /assets/*: cached forever (Vite content-hashes the names).
 *   - /api/*: forwarded as-is to the backend (BACKEND_INTERNAL_URL), so the web app and its API
 *     are one origin on one port — what a single HTTPS port (443 through Traefik) needs.
 *
 * Config from the environment (set by ecosystem.config.cjs from the root .env):
 *   FRONTEND_PORT   port to listen on (required)
 *   FRONTEND_DIST   folder to serve (default apps/frontend/dist)
 *   SSL_CERT_PATH / SSL_KEY_PATH   serve HTTPS with this certificate (optional; plain HTTP without)
 *   BACKEND_INTERNAL_URL   where /api/* goes, e.g. https://127.0.0.1:50008 (optional; /api is 404 without)
 */
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const ROOT = path.resolve(process.env.FRONTEND_DIST || path.join(__dirname, "..", "apps", "frontend", "dist"));
const PORT = Number(process.env.FRONTEND_PORT);
if (!Number.isInteger(PORT) || PORT <= 0) {
  console.error("FRONTEND_PORT is missing or invalid — set it in the root .env.");
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error(`No index.html in ${ROOT} — run \`npm run build\` first.`);
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
  ".apk": "application/vnd.android.package-archive",
};

const NO_CACHE = new Set(["/index.html", "/trippin-apk.json", "/sw.js", "/manifest.webmanifest"]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function serveFile(req, res, filePath, urlPath) {
  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  const headers = {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Content-Length": stat.size,
    "Last-Modified": stat.mtime.toUTCString(),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": NO_CACHE.has(urlPath) ? "no-store" : urlPath.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  };
  if (ext === ".apk") headers["Content-Disposition"] = `attachment; filename="${path.basename(filePath)}"`;
  res.writeHead(200, headers);
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(filePath).pipe(res);
}

// The backend, for /api/*. Only a loopback target skips certificate checks: the backend serves
// the public hostname's certificate, which 127.0.0.1 can never match.
const BACKEND = (() => {
  const raw = (process.env.BACKEND_INTERNAL_URL || "").trim();
  if (!raw) return null;
  const url = new URL(raw);
  const loopback = ["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname);
  return { url, lib: url.protocol === "https:" ? https : http, loopback };
})();
const UPSTREAM_TIMEOUT_MS = 95_000; // a little past the backend's slowest calls (clients give up at 90s)

function isApiPath(urlPath) {
  return urlPath === "/api" || urlPath.startsWith("/api/");
}

/** Streams the request to the backend and its answer back, headers and status untouched. */
function proxy(req, res) {
  const target = new URL(req.url, BACKEND.url);
  const headers = { ...req.headers };
  const peer = req.socket.remoteAddress || "";
  headers["x-forwarded-for"] = headers["x-forwarded-for"] ? `${headers["x-forwarded-for"]}, ${peer}` : peer;
  headers["x-forwarded-proto"] = tls ? "https" : "http";
  headers["x-forwarded-host"] = req.headers.host || "";

  const upstream = BACKEND.lib.request(
    target,
    { method: req.method, headers, rejectUnauthorized: !BACKEND.loopback, timeout: UPSTREAM_TIMEOUT_MS },
    (answer) => {
      res.writeHead(answer.statusCode || 502, answer.headers);
      answer.pipe(res);
    },
  );
  upstream.on("timeout", () => upstream.destroy(new Error("timeout")));
  upstream.on("error", (err) => {
    if (res.headersSent) return res.destroy();
    send(res, err.message === "timeout" ? 504 : 502, "Trippin's API isn't reachable right now. Try again in a moment.");
  });
  req.pipe(upstream);
}

function handler(req, res) {
  let apiPath;
  try {
    apiPath = new URL(req.url, "http://localhost").pathname;
  } catch {
    return send(res, 400, "Bad request");
  }
  if (isApiPath(apiPath)) {
    if (!BACKEND) return send(res, 404, "Not found");
    return proxy(req, res);
  }

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", { Allow: "GET, HEAD" });

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    return send(res, 400, "Bad request");
  }
  if (urlPath === "/") urlPath = "/index.html";

  // Never leave the dist folder, whatever the path says.
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) return send(res, 403, "Forbidden");

  const hasExt = path.extname(urlPath) !== "";
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(req, res, filePath, urlPath);
  if (hasExt) return send(res, 404, "Not found");
  return serveFile(req, res, path.join(ROOT, "index.html"), "/index.html");
}

const certPath = (process.env.SSL_CERT_PATH || "").trim();
const keyPath = (process.env.SSL_KEY_PATH || "").trim();
const tls = Boolean(certPath && keyPath);
const server = tls
  ? https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, handler)
  : http.createServer(handler);

server.listen(PORT, () => console.log(`Frontend: serving ${ROOT} on ${tls ? "https" : "http"}://0.0.0.0:${PORT}`));
