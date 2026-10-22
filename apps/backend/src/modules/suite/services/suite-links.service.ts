import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Trip as TripModel } from "@/models/Trip";
import { suiteAppConfig, suitePromo, type SuiteAppConfig } from "@/modules/suite/config/suite-apps";
import { signSuiteRequest } from "@/modules/suite/lib/suite-signature";
import { enqueueSuiteEvents, suiteTripFields } from "@/modules/suite/services/suite-events.service";
import {
  SUITE_APPS,
  type ConnectedAppView,
  type SuiteApp,
  type SuiteCandidatesView,
  type SuiteLink,
  type SuiteSummary,
  type TripLinksView,
} from "@/modules/suite/types/suite.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { TripRepository } from "@/repositories/trip.repository";
import { UserRepository } from "@/repositories/user.repository";

type Result<T> = { success: true; data: T; message?: string } | { success: false; error: string };

const QUERY_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60_000;
/** A failed lookup is retried sooner than a good one is refreshed, but not on every page view. */
const FAILURE_TTL_MS = 10_000;

// ---------------------------------------------------------------------------------------------
// Signed queries to the other apps, cached per process
// ---------------------------------------------------------------------------------------------

type QueryResult = { status: number; body: Record<string, unknown> } | { status: "unreachable"; error: string };

const cache = new Map<string, { expires: number; value: QueryResult }>();

/** Drops cached lookups (all, or those whose key starts with `prefix`). */
export function clearSuiteCache(prefix?: string) {
  if (!prefix) return cache.clear();
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

async function signedGet(config: SuiteAppConfig, path: string): Promise<QueryResult> {
  if (!config.apiUrl || !config.secret) return { status: "unreachable", error: "not configured" };
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      headers: { Accept: "application/json", ...signSuiteRequest(config.secret, "") },
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      const parsed = text ? JSON.parse(text) : {};
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      if (res.ok) return { status: "unreachable", error: "response isn't JSON" };
    }
    return { status: res.status, body };
  } catch (err) {
    return { status: "unreachable", error: err instanceof Error ? err.message : String(err) };
  }
}

async function cachedGet(key: string, config: SuiteAppConfig, path: string): Promise<QueryResult> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await signedGet(config, path);
  const good = value.status === 200 || value.status === 404;
  cache.set(key, { expires: Date.now() + (good ? CACHE_TTL_MS : FAILURE_TTL_MS), value });
  return value;
}

/** Whether `sub` has an account in the app; null when that can't be told right now. */
async function hasAccountIn(config: SuiteAppConfig, sub: string | undefined): Promise<boolean | null> {
  if (!sub) return null;
  const res = await cachedGet(`exists:${config.app}:${sub}`, config, `/integrations/trippin/users/${encodeURIComponent(sub)}`);
  if (res.status !== 200 || typeof res.body.exists !== "boolean") return null;
  return res.body.exists;
}

function isSummary(app: SuiteApp, body: Record<string, unknown>): boolean {
  if (body.linked !== true) return false;
  return app === "spendlog" ? typeof body.totalSpentMinor === "number" : typeof body.photoCount === "number";
}

async function fetchSummary(
  config: SuiteAppConfig,
  tripId: string,
  sub: string | undefined,
): Promise<{ summary: SuiteSummary | null; summaryError: string | null; notLinked?: boolean }> {
  const unreachable = { summary: null, summaryError: `Couldn't reach ${config.name}` };
  if (!config.apiUrl || !config.secret) return unreachable;
  const query = sub ? `?sub=${encodeURIComponent(sub)}` : "";
  const res = await cachedGet(
    `summary:${config.app}:${tripId}:${sub ?? ""}`,
    config,
    `/integrations/trippin/trips/${encodeURIComponent(tripId)}/summary${query}`,
  );
  if (res.status === 404) return { summary: null, summaryError: null, notLinked: true };
  if (res.status !== 200 || !isSummary(config.app, res.body)) return unreachable;
  return { summary: res.body as unknown as SuiteSummary, summaryError: null };
}

// ---------------------------------------------------------------------------------------------
// GET /trips/:id/links
// ---------------------------------------------------------------------------------------------

async function appView(app: SuiteApp, trip: Trip, sub: string | undefined): Promise<ConnectedAppView> {
  const config = suiteAppConfig(app);
  const link: SuiteLink | undefined = trip.links?.[app];
  const enabled = !!link?.enabled;
  // Worth asking for a summary once the other side has (or had) the trip.
  const wantSummary = enabled && (link?.status === "linked" || !!link?.remoteId);

  const [hasAccount, summaryResult] = await Promise.all([
    hasAccountIn(config, sub),
    wantSummary ? fetchSummary(config, trip.id, sub) : Promise.resolve({ summary: null, summaryError: null }),
  ]);

  return {
    app,
    name: config.name,
    tagline: config.tagline,
    enabled,
    status: link?.status ?? null,
    url: link?.url ?? summaryResult.summary?.url ?? null,
    lastError: link?.lastError ?? null,
    linkedAt: link?.linkedAt ?? null,
    skippedMembers: enabled ? (link?.skippedMembers ?? []) : [],
    hasAccount,
    summary: summaryResult.summary,
    summaryError: summaryResult.summaryError,
    promo: !enabled || hasAccount === false ? suitePromo(config) : null,
    webUrl: config.webUrl,
    apkUrl: config.apkUrl,
  };
}

async function buildView(trip: Trip, userId: string): Promise<TripLinksView> {
  const viewer = await UserRepository.findById(userId);
  const sub = viewer?.oidcSub;
  const [spendlog, inframe] = await Promise.all([appView("spendlog", trip, sub), appView("inframe", trip, sub)]);
  return { canManage: trip.userId === userId, apps: { spendlog, inframe } };
}

export async function getTripLinks(tripId: string, userId: string): Promise<Result<TripLinksView>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  return { success: true, data: await buildView(trip, userId) };
}

// ---------------------------------------------------------------------------------------------
// Switching apps on and off
// ---------------------------------------------------------------------------------------------

/** `true` / `false`, or `{ on: true, attachTo: "<id>" }` to link one of the owner's existing items there. */
const toggleSchema = z.union([
  z.boolean(),
  z.object({ on: z.boolean(), attachTo: z.string().trim().min(1).max(200).optional() }).strict(),
]);

export const linkTogglesSchema = z
  .object({ spendlog: toggleSchema.optional(), inframe: toggleSchema.optional() })
  .refine((v) => v.spendlog !== undefined || v.inframe !== undefined, "Say which app to switch: spendlog and/or inframe");

export type LinkToggle = z.infer<typeof toggleSchema>;
export type LinkToggles = Partial<Record<SuiteApp, LinkToggle>>;

const wanted = (toggle: LinkToggle | undefined) => (typeof toggle === "object" ? toggle.on : toggle);
const attachOf = (toggle: LinkToggle | undefined) => (typeof toggle === "object" && toggle.on ? toggle.attachTo : undefined);

/** Lenient read of `links` from the trip-creation body (JSON or form fields). */
export function parseLinkToggles(raw: unknown): LinkToggles {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const flag = (x: unknown) => (x === true || x === "true" || x === "on" ? true : x === false || x === "false" ? false : undefined);
  return { spendlog: flag(v.spendlog), inframe: flag(v.inframe) };
}

/**
 * Switching on (or "Try again" on a link in error) queues trip.linked (re-linking keeps any earlier remote id, so the other side can
 * find its trip again); switching off queues trip.unlinked and keeps everything on both sides.
 */
export async function applyLinkToggles(trip: Trip, toggles: LinkToggles): Promise<Trip> {
  const turnOn: SuiteApp[] = [];
  const turnOff: SuiteApp[] = [];
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};

  for (const app of SUITE_APPS) {
    const want = wanted(toggles[app]);
    const current = trip.links?.[app];
    // "Try again": switching on an app that's on but in error re-sends trip.linked.
    const retry = want === true && !!current?.enabled && current.status === "error";
    if (want === undefined || (want === !!current?.enabled && !retry)) continue;
    if (want) {
      turnOn.push(app);
      set[`links.${app}.enabled`] = true;
      set[`links.${app}.status`] = "pending";
    } else {
      turnOff.push(app);
      set[`links.${app}.enabled`] = false;
      set[`links.${app}.status`] = "unlinked";
    }
    unset[`links.${app}.lastError`] = 1;
  }
  if (turnOn.length === 0 && turnOff.length === 0) return trip;

  await connectDB();
  await TripModel.updateOne({ _id: trip.id }, { $set: set, $unset: unset });
  const updated = (await TripRepository.findByIdForOwner(trip.id, trip.userId)) ?? trip;

  // An app linked to an existing item there gets its own trip.linked naming it.
  const attach = Object.fromEntries(turnOn.map((app) => [app, attachOf(toggles[app])]).filter(([, id]) => id));
  if (turnOn.length > 0) await enqueueSuiteEvents(updated, "trip.linked", turnOn, attach);
  if (turnOff.length > 0) await enqueueSuiteEvents(updated, "trip.unlinked", turnOff);
  for (const app of [...turnOn, ...turnOff]) clearSuiteCache(`summary:${app}:${trip.id}:`);
  return updated;
}

const candidateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  archived: z.boolean().default(false),
  linkedHere: z.boolean().default(false),
  counts: z.record(z.string(), z.number()).default({}),
  impact: z.object({ added: z.number(), leaving: z.number() }).nullable().default(null),
});

/**
 * GET /trips/:id/links/:app/candidates — the owner's existing groups (SpendLog) or events
 * (InFrame) this trip could be linked to instead of a new one, best match first, each with what
 * linking it would change. Asked fresh every time: it's what the owner is about to confirm.
 */
export async function getLinkCandidates(tripId: string, userId: string, app: string): Promise<Result<SuiteCandidatesView>> {
  if (!(SUITE_APPS as readonly string[]).includes(app)) return { success: false, error: "Unknown app" };
  const role = await TripRepository.getRole(tripId, userId);
  if (!role) return { success: false, error: "Trip not found" };
  if (role !== "owner") return { success: false, error: "Only the trip owner can connect SpendLog or InFrame" };
  const trip = await TripRepository.findByIdForOwner(tripId, userId);
  const owner = await UserRepository.findById(userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const suiteApp = app as SuiteApp;
  const config = suiteAppConfig(suiteApp);
  // No identity yet: nothing of theirs can be found there.
  if (!owner?.oidcSub) return { success: true, data: { app: suiteApp, candidates: [] } };
  const fields = suiteTripFields(trip);
  const query = new URLSearchParams({ sub: owner.oidcSub, tripId: trip.id, title: fields.title, start: fields.startDate, end: fields.endDate });
  const res = await signedGet(config, `/integrations/trippin/candidates?${query}`);
  if (res.status !== 200) return { success: false, error: `Couldn't reach ${config.name}` };
  const parsed = z.array(candidateSchema).safeParse(res.body.candidates);
  if (!parsed.success) return { success: false, error: `Couldn't reach ${config.name}` };
  return { success: true, data: { app: suiteApp, candidates: parsed.data } };
}

export async function setTripLinks(tripId: string, userId: string, raw: unknown): Promise<Result<TripLinksView>> {
  const parsed = linkTogglesSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const role = await TripRepository.getRole(tripId, userId);
  if (!role) return { success: false, error: "Trip not found" };
  if (role !== "owner") return { success: false, error: "Only the trip owner can connect SpendLog or InFrame" };
  const trip = await TripRepository.findByIdForOwner(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const updated = await applyLinkToggles(trip, parsed.data);
  return { success: true, data: await buildView(updated, userId) };
}
