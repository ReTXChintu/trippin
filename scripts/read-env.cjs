/**
 * Reads the monorepo's single root .env without any dependency (used by the PM2 ecosystem file and
 * the deploy health check, which run before/outside node_modules resolution). Values already in
 * process.env win, so a host can override anything.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function parse(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n");
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    out[match[1]] = value;
  }
  return out;
}

function readEnv() {
  const file = process.env.ENV_FILE || path.join(ROOT, ".env");
  const fromFile = fs.existsSync(file) ? parse(fs.readFileSync(file, "utf8")) : {};
  return { ...fromFile, ...process.env };
}

/** A port from the env, or a clear error naming the missing variable. */
function requirePort(env, key) {
  const port = Number(env[key]);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${key} is missing or invalid — set it in the .env file at the repo root (${ROOT}).`);
  }
  return port;
}

module.exports = { ROOT, readEnv, requirePort };
