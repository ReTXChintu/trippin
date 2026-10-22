import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import express from "express";
import { requestLog } from "@/middleware/request-log.middleware";

describe("request log", () => {
  const lines: string[] = [];
  let server: http.Server;
  let base: string;

  before(async () => {
    const app = express();
    app.set("trust proxy", "loopback");
    app.use(requestLog((line) => lines.push(line)));
    app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));
    app.get("/api/v1/trips", (req, res) => {
      // What the auth middleware does once the token checks out.
      req.user = { sub: "user-7", email: "asha@example.com", name: "Asha" };
      res.json({ data: [] });
    });
    app.post("/api/v1/trips", (_req, res) => res.status(201).json({}));
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  test("one line per answered request: method, path, status, time, user and ip — never the query", async () => {
    await fetch(`${base}/api/v1/trips?token=SECRET-SHARE-TOKEN`);
    await fetch(`${base}/api/v1/trips`, { method: "POST" });
    await fetch(`${base}/api/v1/nowhere`);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(lines.length, 3);
    assert.match(lines[0], /^GET \/api\/v1\/trips 200 \d+\.\dms user=user-7 ip=127\.0\.0\.1$/);
    assert.match(lines[1], /^POST \/api\/v1\/trips 201 \d+\.\dms ip=127\.0\.0\.1$/);
    assert.match(lines[2], /^GET \/api\/v1\/nowhere 404 /);
    assert.ok(lines.every((line) => !line.includes("SECRET")), "query strings stay out of the log");
  });

  test("the health check stays quiet", async () => {
    const before = lines.length;
    await fetch(`${base}/api/v1/health`);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(lines.length, before);
  });

  test("behind the frontend proxy on this machine, the client's address is logged", async () => {
    await fetch(`${base}/api/v1/trips`, { method: "POST", headers: { "x-forwarded-for": "203.0.113.9" } });
    await new Promise((r) => setTimeout(r, 20));
    assert.match(lines.at(-1)!, / ip=203\.0\.113\.9$/);
  });
});
