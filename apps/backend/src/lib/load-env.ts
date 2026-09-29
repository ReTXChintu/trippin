import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The monorepo keeps a single .env at the repo root. Found by walking up from this file, so it works
 * from src/ (tsx), from the dist/ bundle, and wherever PM2 starts the process. ENV_FILE overrides it.
 * Imported first in index.ts so every module sees the vars at load time.
 */
function findEnvFile(): string | undefined {
  if (process.env.ENV_FILE) return process.env.ENV_FILE;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = path.join(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const envFile = findEnvFile();
if (envFile) config({ path: envFile });

// NODE_ENV deliberately isn't in the shared .env (it would turn the frontend's production build into
// a development one), so default it here for local runs. PM2 sets it to "production".
process.env.NODE_ENV ??= "development";
