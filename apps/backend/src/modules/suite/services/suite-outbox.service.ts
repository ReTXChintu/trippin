import { connectDB } from "@/lib/mongodb";
import { SuiteOutbox, type ISuiteOutboxDocument } from "@/models/SuiteOutbox";
import { Trip as TripModel } from "@/models/Trip";
import { suiteAppConfig } from "@/modules/suite/config/suite-apps";
import { signSuiteRequest } from "@/modules/suite/lib/suite-signature";

/**
 * Delivers the suite outbox: POST {APP_API_URL}/integrations/trippin/events, signed. A network
 * error or 5xx is retried with exponential backoff (30s, 1m, 2m … capped at 2h) until the event is
 * a day old, then it's marked failed; a refusal (4xx, 503) fails at once and puts the link in error. Per (app, trip) events go strictly in order: a later one waits for an earlier
 * one that hasn't gone through yet.
 */

export const OUTBOX_BASE_DELAY_MS = 30_000;
export const OUTBOX_MAX_DELAY_MS = 2 * 60 * 60_000;
export const OUTBOX_GIVE_UP_AFTER_MS = 24 * 60 * 60_000;
const DELIVERY_TIMEOUT_MS = 10_000;
const BATCH = 200;

/** Wait before the next try, after `attempts` failed ones. */
export function outboxBackoffMs(attempts: number): number {
  return Math.min(OUTBOX_BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1), OUTBOX_MAX_DELAY_MS);
}

/**
 * `retry`: a network error or a 5xx (other than 503) — try again later. Otherwise the other app
 * refused this attempt for good (a 4xx such as 409 "running_trip_overlap", or 503 "not set up"):
 * the link goes to error with the message to show, and the owner can try again.
 */
type DeliveryOutcome = { ok: true; body: Record<string, unknown> } | { ok: false; error: string; retry: boolean };

function refusalMessage(name: string, status: number, data: Record<string, unknown>, text: string): string {
  // A 409 carries a sentence meant to be shown as-is.
  if (typeof data.error === "string" && data.error.trim() && status === 409) return data.error.trim();
  if (status === 409 && data.code === "owner_unavailable") {
    return `The trip owner's ${name} account isn't connected to this sign-in yet — sign in to ${name} once with the same account, then try again.`;
  }
  if (status === 401 || status === 403) return `${name} refused Trippin's signature — check the shared suite secret on both servers.`;
  if (status === 503) return `${name} isn't accepting Trippin trips right now (it may not be set up for Trippin yet).`;
  const detail = typeof data.error === "string" && data.error.trim() ? data.error.trim() : text.slice(0, 200);
  return `${name} refused the request (${status})${detail ? `: ${detail}` : ""}`;
}

async function post(event: ISuiteOutboxDocument): Promise<DeliveryOutcome> {
  const config = suiteAppConfig(event.app);
  if (!config.apiUrl || !config.secret) {
    const prefix = event.app.toUpperCase();
    return { ok: false, retry: true, error: `${config.name} isn't set up on this Trippin server (${prefix}_API_URL / ${prefix}_SUITE_SECRET)` };
  }
  const body = JSON.stringify(event.payload);
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${config.apiUrl}/integrations/trippin/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...signSuiteRequest(config.secret, body) },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    text = await res.text();
  } catch (err) {
    const reason = err instanceof Error ? (err.name === "TimeoutError" ? "timed out" : err.message) : String(err);
    return { ok: false, retry: true, error: `Couldn't reach ${config.name}: ${reason}` };
  }

  let data: Record<string, unknown> = {};
  try {
    const parsed = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    if (res.ok) return { ok: false, retry: true, error: `${config.name} sent a response that isn't JSON` };
  }
  if (!res.ok) {
    const retry = res.status >= 500 && res.status !== 503;
    const error = retry ? `${config.name} answered ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}` : refusalMessage(config.name, res.status, data, text);
    return { ok: false, retry, error };
  }
  // 200 { ignored: "not_linked" } for an update to a trip it doesn't have linked: fine.
  if (event.type === "trip.linked" && (typeof data.remoteId !== "string" || !data.remoteId)) {
    return { ok: false, retry: true, error: `${config.name} didn't return the linked trip's id` };
  }
  return { ok: true, body: data };
}

function skippedMembers(body: Record<string, unknown>) {
  if (!Array.isArray(body.skippedMembers)) return [];
  return body.skippedMembers
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => ({
      sub: typeof m.sub === "string" ? m.sub : null,
      email: typeof m.email === "string" ? m.email : "",
      reason: typeof m.reason === "string" ? m.reason : "",
    }));
}

async function recordSuccess(event: ISuiteOutboxDocument, body: Record<string, unknown>, now: Date) {
  event.status = "delivered";
  event.attempts += 1;
  event.deliveredAt = now;
  event.lastError = undefined;
  await event.save();

  const path = `links.${event.app}`;
  if (event.type === "trip.linked") {
    // Only if it's still switched on — a toggle-off queued meanwhile wins.
    await TripModel.updateOne(
      { _id: event.tripId, [`${path}.enabled`]: true },
      {
        $set: {
          [`${path}.status`]: "linked",
          [`${path}.remoteId`]: String(body.remoteId),
          ...(typeof body.url === "string" && body.url ? { [`${path}.url`]: body.url } : {}),
          [`${path}.linkedAt`]: now.toISOString(),
          [`${path}.skippedMembers`]: skippedMembers(body),
        },
        $unset: { [`${path}.lastError`]: 1 },
      },
    );
  } else if (event.type === "trip.members_changed") {
    await TripModel.updateOne(
      { _id: event.tripId, [`${path}.enabled`]: true },
      { $set: { [`${path}.skippedMembers`]: skippedMembers(body) } },
    );
    await TripModel.updateOne(
      { _id: event.tripId, [`${path}.status`]: "linked", [`${path}.lastError`]: { $exists: true } },
      { $unset: { [`${path}.lastError`]: 1 } },
    );
  } else {
    await TripModel.updateOne(
      { _id: event.tripId, [`${path}.status`]: { $ne: "error" }, [`${path}.lastError`]: { $exists: true } },
      { $unset: { [`${path}.lastError`]: 1 } },
    );
  }
}

async function recordFailure(event: ISuiteOutboxDocument, error: string, retry: boolean, now: Date) {
  event.attempts += 1;
  event.lastError = error;
  const gaveUp = !retry || now.getTime() - event.createdAt.getTime() >= OUTBOX_GIVE_UP_AFTER_MS;
  if (gaveUp) event.status = "failed";
  else event.nextAttemptAt = new Date(now.getTime() + outboxBackoffMs(event.attempts));
  await event.save();

  const path = `links.${event.app}`;
  if (event.type === "trip.unlinked") {
    // Switched off already; nothing to show on the trip.
    return;
  }
  const message = retry && gaveUp ? `Gave up after a day of retries — ${error}` : error;
  if (event.type === "trip.linked" || !retry) {
    // Not linked (yet), or refused for good: the owner sees it, with "Try again".
    await TripModel.updateOne(
      { _id: event.tripId, [`${path}.enabled`]: true },
      { $set: { [`${path}.status`]: "error", [`${path}.lastError`]: message } },
    );
  } else {
    // The link itself is fine; an update that hasn't gone through yet is shown, not fatal.
    await TripModel.updateOne({ _id: event.tripId, [`${path}.enabled`]: true }, { $set: { [`${path}.lastError`]: message } });
  }
}

export interface OutboxRunResult {
  delivered: number;
  retrying: number;
  failed: number;
}

/** One pass over the due events. `now` is injectable so tests can step through the backoff. */
export async function processSuiteOutbox(now: Date = new Date()): Promise<OutboxRunResult> {
  await connectDB();
  const result: OutboxRunResult = { delivered: 0, retrying: 0, failed: 0 };
  // ObjectIds increase in insertion order within this (single) process: that's the event order.
  const pending = await SuiteOutbox.find({ status: "pending" }).sort({ _id: 1 }).limit(BATCH);
  const blocked = new Set<string>();

  for (const event of pending) {
    const key = `${event.app}:${event.tripId}`;
    if (blocked.has(key)) continue;
    if (event.nextAttemptAt.getTime() > now.getTime()) {
      blocked.add(key);
      continue;
    }
    const outcome = await post(event);
    if (outcome.ok) {
      await recordSuccess(event, outcome.body, now);
      result.delivered += 1;
    } else {
      await recordFailure(event, outcome.error, outcome.retry, now);
      blocked.add(key);
      if (event.status === "failed") result.failed += 1;
      else result.retrying += 1;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// The loop (one per server process)
// ---------------------------------------------------------------------------------------------

let timer: NodeJS.Timeout | null = null;
let running = false;
let again = false;

async function tick() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      await processSuiteOutbox();
    } while (again);
  } catch (err) {
    console.error("[suite] outbox delivery failed:", err);
  } finally {
    running = false;
  }
}

export function startSuiteOutboxWorker(intervalMs = 15_000) {
  if (timer) return;
  timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  void tick();
}

export function stopSuiteOutboxWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Deliver soon after a new event is queued, instead of on the next interval. No-op when the worker isn't running (tests). */
export function kickSuiteOutbox() {
  if (timer) setImmediate(() => void tick());
}
