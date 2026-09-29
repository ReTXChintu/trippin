/**
 * After a deploy: waits for the backend health endpoint and the frontend index to answer on the
 * ports from the root .env. Exits non-zero (failing the deploy) if either doesn't come up.
 */
const { readEnv, requirePort } = require("./read-env.cjs");

const env = readEnv();
const targets = [
  { label: "backend", url: `http://127.0.0.1:${requirePort(env, "PORT")}/api/v1/health` },
  { label: "frontend", url: `http://127.0.0.1:${requirePort(env, "FRONTEND_PORT")}/` },
];
const ATTEMPTS = Number(env.HEALTHCHECK_ATTEMPTS || 30);
const DELAY_MS = Number(env.HEALTHCHECK_DELAY_MS || 2000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor({ label, url }) {
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      const res = await fetch(url);
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
