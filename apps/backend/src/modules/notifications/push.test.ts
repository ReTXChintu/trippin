// Push notifications: phones registered per user, every in-app notification pushed to them,
// tokens Firebase forgot dropped, and trip renames / new dates told to everyone else on the trip.
// MongoDB is in-memory; Firebase is a fake sender.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const FORM = { dailyStartTime: "09:00", dailyEndTime: "20:00", transportationMode: "Walking", travelStyle: "Balanced", status: "draft" };
const GOA = { ...FORM, title: "Goa", destinationCity: "Goa", destinationCountry: "India", startDate: "2026-12-20", endDate: "2026-12-26" };
const uniq = () => randomBytes(6).toString("hex");

let mongo: MongoMemoryServer;
let api: http.Server;
let apiBase = "";
let push: typeof import("@/modules/notifications/services/push.service");
let notify: typeof import("@/modules/trips/services/trip-change-notify.service");
let models: { User: typeof import("@/models/User").User; DeviceToken: typeof import("@/models/DeviceToken").DeviceToken };

const sent: { token: string; title: string; body: string; data: Record<string, string> }[] = [];
const gone = new Set<string>();

interface TestUser {
  id: string;
  name: string;
  email: string;
  token: string;
}

async function makeUser(name: string): Promise<TestUser> {
  const { signAccessToken } = await import("@/lib/jwt");
  const email = `${name.toLowerCase()}-${uniq()}@example.com`;
  const user = await models.User.create({ name, email, oidcSub: `sub-${uniq()}` });
  const id = String(user._id);
  return { id, name, email, token: await signAccessToken({ sub: id, email, name }) };
}

async function call<T = any>(user: TestUser, method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}

/** Lets the fire-and-forget pushes finish. */
const settle = () => new Promise((r) => setTimeout(r, 150));

before(async () => {
  mongo = await MongoMemoryServer.create();
  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri("trippin-push-test"),
    JWT_SECRET: "test-jwt-secret-test-jwt-secret-32",
    ENCRYPTION_SECRET: "test-encryption-secret-test-encryption-secret",
    FRONTEND_URL: "https://trip-pin.example.test",
  });
  delete process.env.SMTP_HOST;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  await (await import("@/lib/mongodb")).connectDB();
  push = await import("@/modules/notifications/services/push.service");
  notify = await import("@/modules/trips/services/trip-change-notify.service");
  models = { User: (await import("@/models/User")).User, DeviceToken: (await import("@/models/DeviceToken")).DeviceToken };
  push.setPushSenderForTests(async (token, message) => {
    if (gone.has(token)) return "gone";
    sent.push({ token, ...message });
    return "sent";
  });
  const { createApp } = await import("@/app");
  api = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => api.once("listening", resolve));
  apiBase = `http://127.0.0.1:${(api.address() as AddressInfo).port}/api/v1`;
});

after(async () => {
  push.setPushSenderForTests(null);
  await mongoose.disconnect();
  await mongo?.stop();
  await new Promise((r) => api?.close(r));
});

beforeEach(() => {
  sent.length = 0;
  gone.clear();
});

describe("phones", () => {
  test("register, move to whoever signs in on that phone, and unregister", async () => {
    const asha = await makeUser("Asha");
    const ravi = await makeUser("Ravi");
    const token = `fcm-${uniq()}`;
    assert.equal((await call(asha, "POST", "/notifications/devices", { token })).status, 200);
    assert.equal((await call(asha, "POST", "/notifications/devices", { token })).status, 200, "again is fine");
    assert.equal(await models.DeviceToken.countDocuments({ token }), 1);

    await call(ravi, "POST", "/notifications/devices", { token });
    assert.equal(String((await models.DeviceToken.findOne({ token }))?.userId), ravi.id, "the phone is Ravi's now");

    await call(asha, "DELETE", "/notifications/devices", { token });
    assert.equal(await models.DeviceToken.countDocuments({ token }), 1, "only the phone's own user removes it");
    await call(ravi, "DELETE", "/notifications/devices", { token });
    assert.equal(await models.DeviceToken.countDocuments({ token }), 0);

    assert.equal((await call(ravi, "POST", "/notifications/devices", { token: "x" })).status, 400);
  });
});

describe("what's pushed", () => {
  test("being added to a trip reaches the phone, with a link to the trip; a forgotten token is dropped", async () => {
    const asha = await makeUser("Asha");
    const ravi = await makeUser("Ravi");
    const live = `fcm-${uniq()}`;
    const dead = `fcm-${uniq()}`;
    await call(ravi, "POST", "/notifications/devices", { token: live });
    await call(ravi, "POST", "/notifications/devices", { token: dead });
    gone.add(dead);

    const trip = (await call(asha, "POST", "/trips", GOA)).body.data.trip;
    assert.equal((await call(asha, "POST", `/trips/${trip.id}/members`, { email: ravi.email })).status, 200);
    await settle();

    const toRavi = sent.filter((s) => s.token === live);
    assert.equal(toRavi.length, 1);
    assert.equal(toRavi[0].data.type, "trip_member_added");
    assert.equal(toRavi[0].data.tripId, trip.id);
    assert.equal(toRavi[0].data.link, `/trip/${trip.id}`);
    assert.ok(toRavi[0].title.length > 0 && toRavi[0].body.length > 0);
    assert.equal(await models.DeviceToken.countDocuments({ token: dead }), 0, "dropped");
  });

  test("a rename or new dates is told to everyone else on the trip, not to whoever changed it", async () => {
    const asha = await makeUser("Asha");
    const ravi = await makeUser("Ravi");
    const ashaPhone = `fcm-${uniq()}`;
    const raviPhone = `fcm-${uniq()}`;
    await call(asha, "POST", "/notifications/devices", { token: ashaPhone });
    await call(ravi, "POST", "/notifications/devices", { token: raviPhone });
    const trip = (await call(asha, "POST", "/trips", GOA)).body.data.trip;
    await call(asha, "POST", `/trips/${trip.id}/members`, { email: ravi.email });
    await settle();
    sent.length = 0;

    const res = await call(asha, "PATCH", `/trips/${trip.id}`, { ...GOA, startDate: "2026-12-21", endDate: "2026-12-27" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    await settle();
    assert.deepEqual(
      sent.map((s) => [s.token, s.title, s.body, s.data.type]),
      [[raviPhone, "Goa: new dates", "Asha moved it to 21–27 Dec 2026.", "trip_changed"]],
    );

    sent.length = 0;
    await call(asha, "PATCH", `/trips/${trip.id}`, { ...GOA, startDate: "2026-12-21", endDate: "2026-12-27", dailyEndTime: "21:00" });
    await settle();
    assert.equal(sent.length, 0, "other edits say nothing");
  });

  test("the wording", () => {
    const base = { title: "Goa", startDate: "2026-12-20T00:00:00.000Z", endDate: "2026-12-26T00:00:00.000Z" };
    assert.deepEqual(notify.tripChangeNote(base, { ...base, title: "Goa trip" }, "Asha"), {
      title: `"Goa" is now "Goa trip"`,
      message: "Asha renamed the trip.",
    });
    assert.deepEqual(notify.tripChangeNote(base, { title: "Goa 2", startDate: "2026-12-28", endDate: "2027-01-03" }, "Asha"), {
      title: "Goa 2: renamed and new dates",
      message: `Asha renamed "Goa" and moved it to 28 Dec 2026 – 3 Jan 2027.`,
    });
    assert.equal(notify.tripChangeNote(base, base, "Asha"), null);
    assert.equal(notify.dateRange("2026-11-28", "2026-12-02"), "28 Nov – 2 Dec 2026");
    assert.equal(notify.dateRange("2026-12-20", "2026-12-20"), "20 Dec 2026");
  });
});
