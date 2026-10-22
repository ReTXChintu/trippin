import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { SuiteOutbox } from "@/models/SuiteOutbox";
import { Trip as TripModel, type ITripDocument } from "@/models/Trip";
import { User } from "@/models/User";
import { trippinTripUrl } from "@/modules/suite/config/suite-apps";
import { kickSuiteOutbox } from "@/modules/suite/services/suite-outbox.service";
import {
  SUITE_APPS,
  type SuiteApp,
  type SuiteEvent,
  type SuiteEventType,
  type SuitePerson,
  type SuiteTripPayload,
} from "@/modules/suite/types/suite.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { toTripDTO } from "@/modules/trips/utils/trip.mapper";

const day = (iso: string) => iso.slice(0, 10);
const unique = (values: (string | undefined)[]) => [...new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v))];

/** "Goa, India"; a multi-city trip lists its base cities in visiting order. */
export function tripDestinationLabel(trip: Pick<Trip, "legs" | "destinationCity" | "destinationCountry">): string {
  const legs = [...trip.legs].sort((a, b) => a.order - b.order);
  const cities = unique(legs.length > 0 ? legs.map((l) => l.baseCity) : [trip.destinationCity]);
  const countries = unique(legs.length > 0 ? legs.map((l) => l.country || trip.destinationCountry) : [trip.destinationCountry]);
  return [...cities, ...countries.filter((c) => !cities.includes(c))].join(", ");
}

/** What the other apps mirror; a change to any of these sends trip.updated. */
export function suiteTripFields(trip: Trip) {
  return {
    title: trip.title,
    startDate: day(trip.startDate),
    endDate: day(trip.endDate),
    destination: tripDestinationLabel(trip),
  };
}

export function suiteFieldsChanged(before: Trip, after: Trip): boolean {
  const a = suiteTripFields(before);
  const b = suiteTripFields(after);
  return a.title !== b.title || a.startDate !== b.startDate || a.endDate !== b.endDate || a.destination !== b.destination;
}

/** The trip as the other apps see it: dates, destination, and everyone on it with their identity-server subject. */
export async function buildSuiteTripPayload(trip: Trip): Promise<SuiteTripPayload> {
  await connectDB();
  const ids = [trip.userId, ...trip.memberIds].filter((id) => mongoose.isValidObjectId(id));
  const users = await User.find({ _id: { $in: ids } }).select({ name: 1, email: 1, oidcSub: 1 }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const person = (id: string): SuitePerson | null => {
    const u = byId.get(id);
    return u ? { sub: u.oidcSub ?? null, email: u.email, name: u.name } : null;
  };

  const owner = person(trip.userId) ?? { sub: null, email: "", name: "" };
  const members: SuiteTripPayload["members"] = [{ ...owner, role: "owner" }];
  for (const id of trip.memberIds) {
    const p = person(id);
    // Someone from before one sign-in has no identity-server subject yet, and
    // the other apps can only match people by it. They're left out until they
    // sign in, when emitForNewlyLinkedUser sends the trip's members again.
    if (p?.sub) members.push({ ...p, role: trip.viewerIds.includes(id) ? "viewer" : "editor" });
  }

  return { id: trip.id, ...suiteTripFields(trip), url: trippinTripUrl(trip.id), owner, members };
}

export function enabledSuiteApps(trip: Pick<Trip, "links">): SuiteApp[] {
  return SUITE_APPS.filter((app) => trip.links?.[app]?.enabled);
}

/**
 * Writes `type` to the outbox for each app — by default the ones enabled on the trip. Snapshot of
 * the trip taken now, so a trip that's about to be deleted can still be unlinked.
 */
export async function enqueueSuiteEvents(
  trip: Trip,
  type: SuiteEventType,
  apps: SuiteApp[] = enabledSuiteApps(trip),
  /** trip.linked: per app, the existing item there the owner chose instead of a new one. */
  attachTo: Partial<Record<SuiteApp, string>> = {},
): Promise<SuiteEvent[]> {
  if (apps.length === 0) return [];
  const payload = await buildSuiteTripPayload(trip);
  const now = new Date();
  const events = apps.map((app) => {
    const event: SuiteEvent = { id: randomUUID(), type, occurredAt: now.toISOString(), trip: payload };
    if (type === "trip.linked" && attachTo[app]) event.attachTo = attachTo[app];
    return { app, event };
  });
  await SuiteOutbox.insertMany(
    events.map(({ app, event }) => ({
      eventId: event.id,
      app,
      tripId: trip.id,
      type,
      payload: event,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
    })),
    { ordered: true },
  );
  kickSuiteOutbox();
  return events.map((e) => e.event);
}

/**
 * Hook for the trip services: after a change, queue `type` for the apps enabled on the trip.
 * Never fails the request that made the change — a lost event is logged, not thrown.
 */
export async function emitTripEvent(tripId: string, type: SuiteEventType): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(tripId)) return;
    await connectDB();
    const doc = await TripModel.findById(tripId).lean();
    if (!doc) return;
    const trip = toTripDTO(doc as unknown as ITripDocument);
    await enqueueSuiteEvents(trip, type);
  } catch (err) {
    console.error(`[suite] couldn't queue ${type} for trip ${tripId}:`, err);
  }
}

/**
 * An account from before one sign-in has just been tied to its identity: the
 * trips it's on that are linked to other apps were sent without it, so send
 * their members again and it joins there too.
 */
export async function emitForNewlyLinkedUser(userId: string): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(userId)) return;
    await connectDB();
    const docs = await TripModel.find({
      $or: [{ userId }, { memberIds: userId }],
      $and: [{ $or: [{ "links.spendlog.enabled": true }, { "links.inframe.enabled": true }] }],
    }).lean();
    for (const doc of docs) {
      await enqueueSuiteEvents(toTripDTO(doc as unknown as ITripDocument), "trip.members_changed");
    }
  } catch (err) {
    console.error(`[suite] couldn't resend members for newly linked user ${userId}:`, err);
  }
}

/** Same, for a trip already loaded (e.g. one about to be deleted). */
export async function emitTripEventFor(trip: Trip, type: SuiteEventType): Promise<void> {
  try {
    await enqueueSuiteEvents(trip, type);
  } catch (err) {
    console.error(`[suite] couldn't queue ${type} for trip ${trip.id}:`, err);
  }
}
