// Trippin as the suite's hub: the outbox to SpendLog / InFrame (stub servers that check the
// signature), the hooks that emit events, switching links on and off, and the /links view.
// MongoDB is in-memory.
//   npm test -w apps/backend
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { SuiteEvent } from "@/modules/suite/types/suite.types";

const SPENDLOG_SECRET = "spendlog-test-secret";
const INFRAME_SECRET = "inframe-test-secret";
const FRONTEND = "https://trip-pin.example.test";

const uniq = () => randomBytes(6).toString("hex");

/** The rest of the trip form, which create and update both require. */
const FORM = { dailyStartTime: "09:00", dailyEndTime: "20:00", transportationMode: "Walking", travelStyle: "Balanced", status: "draft" };

// ---------------------------------------------------------------------------------------------
// Stub SpendLog / InFrame
// ---------------------------------------------------------------------------------------------

interface Stub {
  server: http.Server;
  base: string;
  /** Events received with a valid signature, in order. */
  events: SuiteEvent[];
  /** Requests refused for a bad signature. */
  rejected: number;
  /** Answer the next N event POSTs with 500. */
  failNext: number;
  /** Overrides the answer to an event POST (after the signature check). */
  respond: ((event: SuiteEvent) => { status: number; body: unknown } | null) | null;
  /** Down entirely: every request gets 503. */
  down: boolean;
  /** sub → has an account. */
  accounts: Set<string>;
  /** trippin trip id → summary body; missing = 404 { linked: false }. */
  summaries: Map<string, Record<string, unknown>>;
  summaryHits: number;
  existsHits: number;
}

let verify: typeof import("@/modules/suite/lib/suite-signature").verifySuiteSignature;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

async function startStub(secret: string, app: "spendlog" | "inframe"): Promise<Stub> {
  const stub: Stub = {
    server: http.createServer(),
    base: "",
    events: [],
    rejected: 0,
    failNext: 0,
    respond: null,
    down: false,
    accounts: new Set(),
    summaries: new Map(),
    summaryHits: 0,
    existsHits: 0,
  };
  stub.server.on("request", async (req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const raw = await readBody(req);
    const check = verify(secret, req.headers["x-suite-timestamp"] as string, req.headers["x-suite-signature"] as string, raw);
    if (!check.ok) {
      stub.rejected += 1;
      return json(401, { error: check.reason });
    }
    if (stub.down) return json(503, { error: "down" });
    const url = new URL(req.url ?? "/", "http://stub");

    if (req.method === "POST" && url.pathname === "/api/integrations/trippin/events") {
      if (stub.failNext > 0) {
        stub.failNext -= 1;
        return json(500, { error: "try later" });
      }
      const event = JSON.parse(raw) as SuiteEvent;
      const custom = stub.respond?.(event);
      if (custom) return json(custom.status, custom.body);
      // Idempotent by id.
      if (!stub.events.some((e) => e.id === event.id)) stub.events.push(event);
      if (event.type === "trip.linked") {
        return json(200, { remoteId: `${app}-${event.trip.id}`, url: `https://${app}.example.test/trips/${event.trip.id}` });
      }
      return json(200, {});
    }
    const summary = url.pathname.match(/^\/api\/integrations\/trippin\/trips\/([^/]+)\/summary$/);
    if (req.method === "GET" && summary) {
      stub.summaryHits += 1;
      const body = stub.summaries.get(summary[1]);
      return body ? json(200, body) : json(404, { linked: false });
    }
    const user = url.pathname.match(/^\/api\/integrations\/trippin\/users\/([^/]+)$/);
    if (req.method === "GET" && user) {
      stub.existsHits += 1;
      return json(200, { exists: stub.accounts.has(decodeURIComponent(user[1])) });
    }
    return json(404, { error: "not_found" });
  });
  await new Promise<void>((resolve) => stub.server.listen(0, "127.0.0.1", resolve));
  stub.base = `http://127.0.0.1:${(stub.server.address() as AddressInfo).port}/api`;
  return stub;
}

// ---------------------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------------------

let mongo: MongoMemoryServer;
let api: http.Server;
let apiBase = "";
let spendlog: Stub;
let inframe: Stub;

type Outbox = typeof import("@/modules/suite/services/suite-outbox.service");
let outbox: Outbox;
let models: {
  SuiteOutbox: typeof import("@/models/SuiteOutbox").SuiteOutbox;
  Trip: typeof import("@/models/Trip").Trip;
  User: typeof import("@/models/User").User;
};
let clearSuiteCache: typeof import("@/modules/suite/services/suite-links.service").clearSuiteCache;

interface TestUser {
  id: string;
  sub: string;
  email: string;
  name: string;
  token: string;
}

async function makeUser(name = "Traveller"): Promise<TestUser> {
  const { signAccessToken } = await import("@/lib/jwt");
  const sub = `sub-${uniq()}`;
  const email = `${name.toLowerCase().replace(/\s+/g, "-")}-${uniq()}@example.com`;
  const user = await models.User.create({ name, email, oidcSub: sub });
  const id = String(user._id);
  return { id, sub, email, name, token: await signAccessToken({ sub: id, email, name }) };
}

async function call<T = any>(user: TestUser, method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}

async function createTrip(owner: TestUser, links?: { spendlog?: boolean; inframe?: boolean }, extra: Record<string, unknown> = {}) {
  const res = await call(owner, "POST", "/trips", {
    ...FORM,
    title: "Goa with friends",
    destinationCity: "Goa",
    destinationCountry: "India",
    startDate: "2026-12-20",
    endDate: "2026-12-26",
    ...(links ? { links } : {}),
    ...extra,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.trip as { id: string; title: string; links: Record<string, any> };
}

const pendingFor = (tripId: string) => models.SuiteOutbox.find({ tripId, status: "pending" }).sort({ _id: 1 }).lean();
const queued = async (tripId: string) => (await models.SuiteOutbox.find({ tripId }).sort({ _id: 1 }).lean()).map((e) => `${e.app}:${e.type}`);

/** Delivers everything due, as the worker would. */
const drain = (now = new Date()) => outbox.processSuiteOutbox(now);

before(async () => {
  mongo = await MongoMemoryServer.create();
  ({ verifySuiteSignature: verify } = await import("@/modules/suite/lib/suite-signature"));
  spendlog = await startStub(SPENDLOG_SECRET, "spendlog");
  inframe = await startStub(INFRAME_SECRET, "inframe");

  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri("trippin-suite-test"),
    JWT_SECRET: "test-jwt-secret-test-jwt-secret-32",
    ENCRYPTION_SECRET: "test-encryption-secret-test-encryption-secret",
    FRONTEND_URL: FRONTEND,
    SPENDLOG_API_URL: spendlog.base,
    SPENDLOG_SUITE_SECRET: SPENDLOG_SECRET,
    SPENDLOG_WEB_URL: "https://spendlog.example.test",
    SPENDLOG_APK_URL: "https://spendlog.example.test/SpendLog.apk",
    INFRAME_API_URL: inframe.base,
    INFRAME_SUITE_SECRET: INFRAME_SECRET,
    INFRAME_WEB_URL: "https://inframe.example.test",
  });
  delete process.env.INFRAME_APK_URL;
  delete process.env.SMTP_HOST;

  outbox = await import("@/modules/suite/services/suite-outbox.service");
  ({ clearSuiteCache } = await import("@/modules/suite/services/suite-links.service"));
  models = {
    SuiteOutbox: (await import("@/models/SuiteOutbox")).SuiteOutbox,
    Trip: (await import("@/models/Trip")).Trip,
    User: (await import("@/models/User")).User,
  };

  const { createApp } = await import("@/app");
  api = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => api.once("listening", resolve));
  apiBase = `http://127.0.0.1:${(api.address() as AddressInfo).port}/api/v1`;
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  await new Promise((r) => api?.close(r));
  await new Promise((r) => spendlog?.server.close(r));
  await new Promise((r) => inframe?.server.close(r));
});

beforeEach(async () => {
  // Every test starts with an empty queue and healthy apps.
  await drain(new Date(Date.now() + 365 * 86_400_000));
  await models.SuiteOutbox.deleteMany({});
  for (const stub of [spendlog, inframe]) {
    stub.events = [];
    stub.rejected = 0;
    stub.failNext = 0;
    stub.respond = null;
    stub.down = false;
  }
  clearSuiteCache();
});

// ---------------------------------------------------------------------------------------------
// Outbox delivery
// ---------------------------------------------------------------------------------------------

describe("outbox delivery", () => {
  test("delivers trip.linked signed, with the contract's body, and stores remoteId/url", async () => {
    const owner = await makeUser("Asha Rao");
    const trip = await createTrip(owner, { spendlog: true });
    assert.equal(trip.links.spendlog.enabled, true);
    assert.equal(trip.links.spendlog.status, "pending");
    assert.equal(trip.links.inframe, undefined, "InFrame wasn't chosen");
    assert.deepEqual(await queued(trip.id), ["spendlog:trip.linked"]);

    const run = await drain();
    assert.equal(run.delivered, 1);
    assert.equal(spendlog.rejected, 0, "the signature checks out");
    assert.equal(spendlog.events.length, 1);
    assert.equal(inframe.events.length, 0);

    const event = spendlog.events[0];
    assert.equal(event.type, "trip.linked");
    assert.match(event.id, /^[0-9a-f-]{36}$/);
    assert.ok(!Number.isNaN(Date.parse(event.occurredAt)));
    assert.deepEqual(event.trip, {
      id: trip.id,
      title: "Goa with friends",
      startDate: "2026-12-20",
      endDate: "2026-12-26",
      destination: "Goa, India",
      url: `${FRONTEND}/trips/${trip.id}`,
      owner: { sub: owner.sub, email: owner.email, name: "Asha Rao" },
      members: [{ sub: owner.sub, email: owner.email, name: "Asha Rao", role: "owner" }],
    });

    const stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.status, "linked");
    assert.equal(stored?.links?.spendlog?.remoteId, `spendlog-${trip.id}`);
    assert.equal(stored?.links?.spendlog?.url, `https://spendlog.example.test/trips/${trip.id}`);
    assert.ok(stored?.links?.spendlog?.linkedAt);
    const row = await models.SuiteOutbox.findOne({ eventId: event.id }).lean();
    assert.equal(row?.status, "delivered");
  });

  test("a failure is retried with exponential backoff, the link shows the error, then it recovers", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { inframe: true });
    inframe.failNext = 2;
    const t0 = Date.now();

    let run = await drain(new Date(t0));
    assert.deepEqual(run, { delivered: 0, retrying: 1, failed: 0 });
    let [row] = await pendingFor(trip.id);
    assert.equal(row.attempts, 1);
    assert.equal(row.nextAttemptAt.getTime(), t0 + outbox.OUTBOX_BASE_DELAY_MS);
    assert.match(row.lastError ?? "", /500/);
    let stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.inframe?.status, "error");
    assert.match(stored?.links?.inframe?.lastError ?? "", /InFrame answered 500/);

    // Not due yet: nothing is sent.
    run = await drain(new Date(t0 + 10_000));
    assert.deepEqual(run, { delivered: 0, retrying: 0, failed: 0 });

    run = await drain(new Date(t0 + 30_000));
    assert.equal(run.retrying, 1);
    [row] = await pendingFor(trip.id);
    assert.equal(row.attempts, 2);
    assert.equal(row.nextAttemptAt.getTime(), t0 + 30_000 + 2 * outbox.OUTBOX_BASE_DELAY_MS, "the wait doubles");

    run = await drain(new Date(t0 + 30_000 + 60_000));
    assert.equal(run.delivered, 1);
    stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.inframe?.status, "linked");
    assert.equal(stored?.links?.inframe?.remoteId, `inframe-${trip.id}`);
    assert.equal(stored?.links?.inframe?.lastError, undefined);
    assert.equal(inframe.events.length, 1);
  });

  test("backoff doubles up to a cap", () => {
    assert.equal(outbox.outboxBackoffMs(1), 30_000);
    assert.equal(outbox.outboxBackoffMs(2), 60_000);
    assert.equal(outbox.outboxBackoffMs(3), 120_000);
    assert.equal(outbox.outboxBackoffMs(30), outbox.OUTBOX_MAX_DELAY_MS);
  });

  test("gives up after about a day, marking the event failed and the link in error", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    spendlog.failNext = 1;
    const [row] = await pendingFor(trip.id);
    const run = await drain(new Date(row.createdAt.getTime() + outbox.OUTBOX_GIVE_UP_AFTER_MS));
    assert.equal(run.failed, 1);
    const done = await models.SuiteOutbox.findById(row._id).lean();
    assert.equal(done?.status, "failed");
    const stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.status, "error");
    assert.match(stored?.links?.spendlog?.lastError ?? "", /Gave up/);
  });

  test("events for a trip are delivered in order: a later one waits for an earlier failure", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, title: "Goa, take two", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-26" });
    assert.deepEqual(await queued(trip.id), ["spendlog:trip.linked", "spendlog:trip.updated"]);

    spendlog.failNext = 1;
    const t0 = Date.now();
    await drain(new Date(t0));
    assert.equal(spendlog.events.length, 0, "trip.updated didn't jump the queue");
    await drain(new Date(t0 + outbox.OUTBOX_BASE_DELAY_MS));
    assert.deepEqual(spendlog.events.map((e) => e.type), ["trip.linked", "trip.updated"]);
    assert.equal(spendlog.events[1].trip.title, "Goa, take two");
  });

  test("an app that isn't configured keeps its events queued with a clear error", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    const saved = process.env.SPENDLOG_API_URL;
    delete process.env.SPENDLOG_API_URL;
    try {
      await drain();
      const [row] = await pendingFor(trip.id);
      assert.match(row.lastError ?? "", /SPENDLOG_API_URL/);
    } finally {
      process.env.SPENDLOG_API_URL = saved;
    }
  });
});

describe("refusals and SpendLog's extra answers", () => {
  test("409 running_trip_overlap isn't retried; its sentence is the link's error, and Try again re-sends trip.linked", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    const sentence = '"Goa" is already running in SpendLog. End it in SpendLog, then switch tracking on again.';
    spendlog.respond = (e) =>
      e.type === "trip.linked" ? { status: 409, body: { error: sentence, code: "running_trip_overlap", tripTitle: "Goa" } } : null;

    const run = await drain();
    assert.deepEqual(run, { delivered: 0, retrying: 0, failed: 1 });
    assert.equal((await pendingFor(trip.id)).length, 0, "no backoff for a refusal");
    let view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.equal(view.apps.spendlog.status, "error");
    assert.equal(view.apps.spendlog.lastError, sentence);

    // Later updates ("ignored: not_linked" on SpendLog's side) don't clear the refusal.
    spendlog.respond = () => ({ status: 200, body: { ignored: "not_linked" } });
    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, title: "Goa again", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-26" });
    await drain();
    let stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.status, "error");
    assert.equal(stored?.links?.spendlog?.lastError, sentence);

    // The owner ended the other trip in SpendLog and tries again.
    spendlog.respond = null;
    const retry = await call(owner, "PATCH", `/trips/${trip.id}/links`, { spendlog: true });
    assert.equal(retry.status, 200);
    assert.equal(retry.body.data.apps.spendlog.status, "pending");
    assert.equal(retry.body.data.apps.spendlog.lastError, null);
    await drain();
    stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.status, "linked");
    assert.equal(stored?.links?.spendlog?.remoteId, `spendlog-${trip.id}`);
    view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.equal(view.apps.spendlog.lastError, null);
  });

  test("InFrame's 409 owner_unavailable without a sentence gets a readable one", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { inframe: true });
    inframe.respond = () => ({ status: 409, body: { code: "owner_unavailable" } });
    assert.equal((await drain()).failed, 1);
    const stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.inframe?.status, "error");
    assert.match(stored?.links?.inframe?.lastError ?? "", /owner's InFrame account isn't connected/);
  });

  for (const status of [400, 401, 503]) {
    test(`${status} is a refusal too: failed at once, link in error`, async () => {
      const owner = await makeUser();
      const trip = await createTrip(owner, { inframe: true });
      inframe.respond = () => ({ status, body: { error: "nope" } });
      const run = await drain();
      assert.equal(run.failed, 1);
      assert.equal(run.retrying, 0);
      const stored = await models.Trip.findById(trip.id).lean();
      assert.equal(stored?.links?.inframe?.status, "error");
      assert.ok(stored?.links?.inframe?.lastError);
    });
  }

  test("a network error is retried, not refused", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    const saved = process.env.SPENDLOG_API_URL;
    process.env.SPENDLOG_API_URL = "http://127.0.0.1:9";
    try {
      const run = await drain();
      assert.equal(run.retrying, 1);
      assert.match((await pendingFor(trip.id))[0].lastError ?? "", /Couldn't reach SpendLog/);
    } finally {
      process.env.SPENDLOG_API_URL = saved;
    }
  });

  test("a refused members_changed puts a linked app in error", async () => {
    const owner = await makeUser();
    const friend = await makeUser("Friend");
    const trip = await createTrip(owner, { spendlog: true });
    await drain();
    spendlog.respond = () => ({ status: 409, body: { error: "The owner's SpendLog account isn't linked yet.", code: "owner_unavailable" } });
    await call(owner, "POST", `/trips/${trip.id}/members`, { email: friend.email });
    await drain();
    const stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.status, "error");
    assert.equal(stored?.links?.spendlog?.lastError, "The owner's SpendLog account isn't linked yet.");
  });

  test("skippedMembers from trip.linked / trip.members_changed are kept and shown", async () => {
    const owner = await makeUser();
    const a = await makeUser("Ana");
    const b = await makeUser("Ben");
    const trip = await createTrip(owner, { spendlog: true });
    await call(owner, "POST", `/trips/${trip.id}/members`, { email: a.email });
    spendlog.respond = (e) => {
      const skipped = e.trip.members.filter((m) => m.role !== "owner").map((m) => ({ sub: m.sub, email: m.email, reason: "not_signed_in" }));
      return e.type === "trip.linked"
        ? { status: 200, body: { remoteId: "sl-1", url: "https://spendlog.example.test/trips?trip=sl-1", skippedMembers: skipped } }
        : { status: 200, body: { skippedMembers: skipped } };
    };
    await drain();
    let view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.deepEqual(view.apps.spendlog.skippedMembers, [{ sub: a.sub, email: a.email, reason: "not_signed_in" }]);
    assert.equal(view.apps.spendlog.url, "https://spendlog.example.test/trips?trip=sl-1");

    await call(owner, "POST", `/trips/${trip.id}/members`, { email: b.email });
    await drain();
    view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.equal(view.apps.spendlog.skippedMembers.length, 2);

    spendlog.respond = null;
    await call(owner, "DELETE", `/trips/${trip.id}/members?memberUserId=${b.id}`);
    await drain();
    view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.deepEqual(view.apps.spendlog.skippedMembers, [], "an answer without skippedMembers means everyone's in");
  });

  test('200 { ignored: "not_linked" } counts as delivered', async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    await drain();
    spendlog.respond = () => ({ status: 200, body: { ignored: "not_linked" } });
    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, title: "Renamed", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-26" });
    const run = await drain();
    assert.deepEqual(run, { delivered: 1, retrying: 0, failed: 0 });
    assert.equal((await models.Trip.findById(trip.id).lean())?.links?.spendlog?.status, "linked");
  });
});

// ---------------------------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------------------------

describe("events from the trip's hook points", () => {
  test("nothing is queued for a trip with no apps enabled", async () => {
    const owner = await makeUser();
    const friend = await makeUser("Friend");
    const trip = await createTrip(owner);
    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, title: "Renamed", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-27" });
    await call(owner, "POST", `/trips/${trip.id}/members`, { email: friend.email });
    await call(owner, "DELETE", `/trips/${trip.id}`);
    assert.deepEqual(await queued(trip.id), []);
  });

  test("title/date/destination changes send trip.updated; other edits don't", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true, inframe: true });
    const base = { title: "Goa with friends", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-26" };

    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, ...base, notes: "Bring sunscreen" });
    assert.deepEqual(await queued(trip.id), ["spendlog:trip.linked", "inframe:trip.linked"], "notes aren't mirrored");

    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, ...base, endDate: "2026-12-28" });
    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, ...base, endDate: "2026-12-28", destinationCity: "Panaji" });
    assert.deepEqual(await queued(trip.id), [
      "spendlog:trip.linked",
      "inframe:trip.linked",
      "spendlog:trip.updated",
      "inframe:trip.updated",
      "spendlog:trip.updated",
      "inframe:trip.updated",
    ]);
    await drain();
    assert.equal(inframe.events.at(-1)?.trip.endDate, "2026-12-28");
    assert.equal(inframe.events.at(-1)?.trip.destination, "Panaji, India");
  });

  test("members_changed on add, role change, remove, leave, link invite and email invite — only to enabled apps", async () => {
    const owner = await makeUser("Owner");
    const a = await makeUser("Ana");
    const b = await makeUser("Ben");
    const trip = await createTrip(owner, { spendlog: true });
    const membersChanged = async () =>
      (await models.SuiteOutbox.find({ tripId: trip.id, type: "trip.members_changed" }).lean()).map((e) => e.app);

    await call(owner, "POST", `/trips/${trip.id}/members`, { email: a.email });
    assert.deepEqual(await membersChanged(), ["spendlog"], "add");

    await call(owner, "PATCH", `/trips/${trip.id}/members/${a.id}/role`, { role: "viewer" });
    assert.equal((await membersChanged()).length, 2, "role change");
    await drain();
    const roles = spendlog.events.at(-1)!.trip.members.map((m) => [m.name, m.role, m.sub]);
    assert.deepEqual(roles, [
      ["Owner", "owner", owner.sub],
      ["Ana", "viewer", a.sub],
    ]);

    await call(owner, "DELETE", `/trips/${trip.id}/members?memberUserId=${a.id}`);
    assert.equal((await membersChanged()).length, 3, "remove");

    const link = await call(owner, "POST", `/trips/${trip.id}/invites`, { role: "editor" });
    const token = String(link.body.data.url).split("/invite/")[1];
    await call(b, "POST", `/invites/${token}/accept`);
    assert.equal((await membersChanged()).length, 4, "accept invite link");

    await call(b, "POST", `/trips/${trip.id}/leave`);
    assert.equal((await membersChanged()).length, 5, "leave");

    // An email invite, claimed at the invitee's first sign-in.
    const newcomer = `new-${uniq()}@example.com`;
    await call(owner, "POST", `/trips/${trip.id}/members`, { email: newcomer });
    assert.equal((await membersChanged()).length, 5, "a pending invite isn't a member yet");
    const joiner = await models.User.create({ name: "New", email: newcomer, oidcSub: `sub-${uniq()}` });
    const { claimPendingMemberships } = await import("@/modules/trips/services/trip-members.service");
    assert.deepEqual(await claimPendingMemberships(String(joiner._id), newcomer), [trip.id]);
    assert.equal((await membersChanged()).length, 6, "email invite claimed");

    assert.ok((await models.SuiteOutbox.find({ tripId: trip.id, app: "inframe" }).lean()).length === 0, "InFrame isn't enabled");
  });

  test("deleting the trip sends trip.unlinked to the enabled apps", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { inframe: true });
    await drain();
    const res = await call(owner, "DELETE", `/trips/${trip.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(await queued(trip.id), ["inframe:trip.linked", "inframe:trip.unlinked"]);
    await drain();
    assert.deepEqual(inframe.events.map((e) => e.type), ["trip.linked", "trip.unlinked"]);
    assert.equal(inframe.events[1].trip.id, trip.id);
    assert.equal(spendlog.events.length, 0);
  });
});

// ---------------------------------------------------------------------------------------------
// Toggling
// ---------------------------------------------------------------------------------------------

describe("switching apps on and off", () => {
  test("off → trip.unlinked, link kept as unlinked with its remote id; nothing is deleted", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    await drain();

    const off = await call(owner, "PATCH", `/trips/${trip.id}/links`, { spendlog: false });
    assert.equal(off.status, 200);
    assert.equal(off.body.data.apps.spendlog.enabled, false);
    assert.equal(off.body.data.apps.spendlog.status, "unlinked");
    await drain();
    assert.deepEqual(spendlog.events.map((e) => e.type), ["trip.linked", "trip.unlinked"]);

    const stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.remoteId, `spendlog-${trip.id}`, "remote id kept for a later re-link");
    assert.ok(stored, "the Trippin trip is untouched");

    // No more events while it's off.
    await call(owner, "PATCH", `/trips/${trip.id}`, { ...FORM, title: "Quiet", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-26" });
    assert.equal((await pendingFor(trip.id)).length, 0);

    // Back on: trip.linked again, and the receiver re-links the same trip.
    const on = await call(owner, "PATCH", `/trips/${trip.id}/links`, { spendlog: true });
    assert.equal(on.body.data.apps.spendlog.status, "pending");
    await drain();
    assert.deepEqual(spendlog.events.map((e) => e.type), ["trip.linked", "trip.unlinked", "trip.linked"]);
    assert.equal((await models.Trip.findById(trip.id).lean())?.links?.spendlog?.status, "linked");
  });

  test("toggling to the current state queues nothing", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    await call(owner, "PATCH", `/trips/${trip.id}/links`, { spendlog: true, inframe: false });
    assert.deepEqual(await queued(trip.id), ["spendlog:trip.linked"]);
  });

  test("only the owner can switch apps; bad bodies are refused", async () => {
    const owner = await makeUser();
    const editor = await makeUser("Editor");
    const trip = await createTrip(owner);
    await call(owner, "POST", `/trips/${trip.id}/members`, { email: editor.email });

    const res = await call(editor, "PATCH", `/trips/${trip.id}/links`, { spendlog: true });
    assert.equal(res.status, 403);
    assert.equal((await call(owner, "PATCH", `/trips/${trip.id}/links`, {})).status, 400);
    assert.equal((await call(owner, "PATCH", `/trips/${trip.id}/links`, { spendlog: "yes" })).status, 400);
    const stranger = await makeUser("Stranger");
    assert.equal((await call(stranger, "PATCH", `/trips/${trip.id}/links`, { spendlog: true })).status, 404);
    assert.equal((await queued(trip.id)).length, 0);
  });

  test("an off toggle wins over a link that's still being delivered", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    await call(owner, "PATCH", `/trips/${trip.id}/links`, { spendlog: false });
    await drain();
    const stored = await models.Trip.findById(trip.id).lean();
    assert.equal(stored?.links?.spendlog?.enabled, false);
    assert.equal(stored?.links?.spendlog?.status, "unlinked", "the late trip.linked answer doesn't flip it back");
  });
});

// ---------------------------------------------------------------------------------------------
// GET /trips/:id/links
// ---------------------------------------------------------------------------------------------

describe("the connected-apps view", () => {
  test("a linked app shows its live summary for the viewer; cached for a minute", async () => {
    const owner = await makeUser();
    spendlog.accounts.add(owner.sub);
    inframe.accounts.add(owner.sub);
    const trip = await createTrip(owner, { spendlog: true });
    await drain();
    const summary = {
      linked: true,
      url: `https://spendlog.example.test/trips/${trip.id}`,
      totalSpentMinor: 1234500,
      currency: "INR",
      myShareMinor: 411500,
      iOweMinor: 0,
      owedToMeMinor: 200000,
      settlement: [{ fromName: "Ben", toName: "Asha", amountMinor: 200000 }],
      transactionCount: 14,
      updatedAt: new Date().toISOString(),
    };
    spendlog.summaries.set(trip.id, summary);

    const res = await call(owner, "GET", `/trips/${trip.id}/links`);
    assert.equal(res.status, 200);
    const view = res.body.data;
    assert.equal(view.canManage, true);
    assert.equal(view.apps.spendlog.status, "linked");
    assert.equal(view.apps.spendlog.hasAccount, true);
    assert.deepEqual(view.apps.spendlog.summary, summary);
    assert.equal(view.apps.spendlog.summaryError, null);
    assert.equal(view.apps.spendlog.promo, null);
    assert.equal(view.apps.spendlog.url, `https://spendlog.example.test/trips/${trip.id}`);

    // InFrame is off, the viewer has an account: no summary, the toggle (promo data is there for clients that want it).
    assert.equal(view.apps.inframe.enabled, false);
    assert.equal(view.apps.inframe.summary, null);
    assert.equal(view.apps.inframe.hasAccount, true);

    const hits = spendlog.summaryHits;
    await call(owner, "GET", `/trips/${trip.id}/links`);
    assert.equal(spendlog.summaryHits, hits, "served from the 60s cache");
    assert.equal(spendlog.rejected + inframe.rejected, 0, "queries are signed");
  });

  test("an InFrame summary passes through", async () => {
    const owner = await makeUser();
    inframe.accounts.add(owner.sub);
    const trip = await createTrip(owner, { inframe: true });
    await drain();
    const summary = {
      linked: true,
      url: `https://inframe.example.test/e/${trip.id}`,
      photoCount: 212,
      videoCount: 9,
      albumCount: 3,
      coverThumbUrl: null,
      needsStorage: false,
      updatedAt: new Date().toISOString(),
    };
    inframe.summaries.set(trip.id, summary);
    const view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.deepEqual(view.apps.inframe.summary, summary);
  });

  test("an unreachable app degrades to “Couldn't reach …” without failing the page", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true });
    await drain();
    spendlog.down = true;

    const res = await call(owner, "GET", `/trips/${trip.id}/links`);
    assert.equal(res.status, 200);
    const app = res.body.data.apps.spendlog;
    assert.equal(app.status, "linked");
    assert.equal(app.summary, null);
    assert.equal(app.summaryError, "Couldn't reach SpendLog");
    assert.equal(app.hasAccount, null, "unknown, not 'no'");
    assert.equal(app.promo, null, "an unknown account isn't a reason to advertise");

    // Even with the app's server gone entirely.
    clearSuiteCache();
    const saved = process.env.SPENDLOG_API_URL;
    process.env.SPENDLOG_API_URL = "http://127.0.0.1:9";
    try {
      const again = await call(owner, "GET", `/trips/${trip.id}/links`);
      assert.equal(again.status, 200);
      assert.equal(again.body.data.apps.spendlog.summaryError, "Couldn't reach SpendLog");
    } finally {
      process.env.SPENDLOG_API_URL = saved;
    }
  });

  test("no account in the app → its promo, with the website and APK", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner);
    const view = (await call(owner, "GET", `/trips/${trip.id}/links`)).body.data;

    assert.equal(view.apps.spendlog.hasAccount, false);
    assert.deepEqual(view.apps.spendlog.promo, {
      title: "Download SpendLog to analyse your trip spending smartly",
      body: view.apps.spendlog.promo.body,
      cta: "Download SpendLog",
      webUrl: "https://spendlog.example.test",
      apkUrl: "https://spendlog.example.test/SpendLog.apk",
    });
    assert.equal(view.apps.inframe.promo.title, "Install InFrame to save your trip's memories forever");
    assert.equal(view.apps.inframe.promo.webUrl, "https://inframe.example.test");
    assert.equal(view.apps.inframe.promo.apkUrl, "https://inframe.example.test/inframe.apk", "defaults to where InFrame serves it");
  });

  test("a member without an account sees the promo even on a linked trip; non-owners can't manage", async () => {
    const owner = await makeUser();
    const friend = await makeUser("Friend");
    spendlog.accounts.add(owner.sub);
    const trip = await createTrip(owner, { spendlog: true });
    await call(owner, "POST", `/trips/${trip.id}/members`, { email: friend.email });
    await drain();

    const view = (await call(friend, "GET", `/trips/${trip.id}/links`)).body.data;
    assert.equal(view.canManage, false);
    assert.equal(view.apps.spendlog.enabled, true);
    assert.equal(view.apps.spendlog.hasAccount, false);
    assert.ok(view.apps.spendlog.promo);
  });

  test("the trip itself carries its link state; the public share page doesn't", async () => {
    const owner = await makeUser();
    const trip = await createTrip(owner, { spendlog: true, inframe: true });
    await drain();
    const got = (await call(owner, "GET", `/trips/${trip.id}`)).body.data.trip;
    assert.equal(got.links.spendlog.status, "linked");
    assert.equal(got.links.inframe.status, "linked");

    const shared = await call(owner, "POST", `/trips/${trip.id}/share`);
    const slug = String(shared.body.data.shareUrl).split("/share/")[1];
    const pub = (await (await fetch(`${apiBase}/share/${slug}`)).json()) as { data: { trip: { links: unknown } } };
    assert.deepEqual(pub.data.trip.links, {});
  });

  test("someone not on the trip gets a 404", async () => {
    const owner = await makeUser();
    const stranger = await makeUser("Stranger");
    const trip = await createTrip(owner);
    assert.equal((await call(stranger, "GET", `/trips/${trip.id}/links`)).status, 404);
  });
});
