#!/usr/bin/env node
// Runs every *.test.ts under src/ with Node's test runner (through tsx, for TypeScript and the "@/"
// paths). Files are found here rather than with a glob, which Node 20's --test doesn't expand.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tests = readdirSync(path.join(root, "src"), { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => path.join("src", file));

if (tests.length === 0) {
  console.error("No *.test.ts files found under src/.");
  process.exit(1);
}

const result = spawnSync("tsx", ["--test", "--test-concurrency=1", ...tests], { cwd: root, stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
