import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The monorepo keeps a single .env at the repo root (src/lib or dist/lib -> ../../../../.env).
// Imported first in index.ts so every module sees the vars at load time.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

config({ path: path.join(repoRoot, ".env") });

// NODE_ENV deliberately isn't in the shared .env (it would turn the frontend's production build into
// a development one), so default it here for local runs. Hosts set it to "production".
process.env.NODE_ENV ??= "development";
