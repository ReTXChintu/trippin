/**
 * After a deploy: waits for the backend health endpoint and the frontend index to answer on the
 * ports from the root .env. Exits non-zero (failing the deploy) if either doesn't come up.
 */
const http = require("node:http");
const https = require("node:https");
const { readEnv, requirePort } = require("./read-env.cjs");

const env = readEnv();
// Both servers speak HTTPS when a certificate is configured (issued for the public hostname, so
// it isn't checked against 127.0.0.1 here).
const scheme = env.SSL_CERT_PATH && env.SSL_KEY_PATH ? "https" : "http";
const targets = [
  { label: "backend", url: `${scheme}://127.0.0.1:${requirePort(env, "PORT")}/api/v1/health` },
  { label: "frontend", url: `${scheme}://127.0.0.1:${requirePort(env, "FRONTEND_PORT")}/` },
];
const ATTEMPTS = Number(env.HEALTHCHECK_ATTEMPTS || 30);
const DELAY_MS = Number(env.HEALTHCHECK_DELAY_MS || 2000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  const client = url.startsWith("https:") ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(url, { rejectUnauthorized: false, timeout: 5000 }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 300 });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function waitFor({ label, url }) {
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      const res = await get(url);
      if (res.ok) {
        console.log(`✓ ${label} is up (${url})`);
        return true;
      }
    } catch {
      // not listening yet
    }
    await sleep(DELAY_MS);
  }
  console.error(`✗ ${label} did not answer at ${url}`);
  return false;
}

(async () => {
  const results = await Promise.all(targets.map(waitFor));
  process.exit(results.every(Boolean) ? 0 : 1);
})();
