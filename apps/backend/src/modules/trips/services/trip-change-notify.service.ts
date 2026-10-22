import { NotificationRepository } from "@/repositories/notification.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { Trip } from "@/modules/trips/types/trip.types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "20–26 Dec 2026", "28 Dec 2026 – 3 Jan 2027", from ISO dates. */
export function dateRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = endIso.slice(0, 10).split("-").map(Number);
  const full = (y: number, m: number, d: number) => `${d} ${MONTHS[m - 1]} ${y}`;
  if (sy === ey && sm === em) return sd === ed ? full(ey, em, ed) : `${sd}–${full(ey, em, ed)}`;
  if (sy === ey) return `${sd} ${MONTHS[sm - 1]} – ${full(ey, em, ed)}`;
  return `${full(sy, sm, sd)} – ${full(ey, em, ed)}`;
}

/** What to tell the trip's people when its name or dates change; null when neither did. */
export function tripChangeNote(
  before: Pick<Trip, "title" | "startDate" | "endDate">,
  after: Pick<Trip, "title" | "startDate" | "endDate">,
  actorName: string,
): { title: string; message: string } | null {
  const renamed = before.title.trim() !== after.title.trim();
  const moved = before.startDate.slice(0, 10) !== after.startDate.slice(0, 10) || before.endDate.slice(0, 10) !== after.endDate.slice(0, 10);
  const dates = dateRange(after.startDate, after.endDate);
  if (renamed && moved) return { title: `${after.title}: renamed and new dates`, message: `${actorName} renamed "${before.title}" and moved it to ${dates}.` };
  if (renamed) return { title: `"${before.title}" is now "${after.title}"`, message: `${actorName} renamed the trip.` };
  if (moved) return { title: `${after.title}: new dates`, message: `${actorName} moved it to ${dates}.` };
  return null;
}

/** Tells everyone on the trip but whoever changed it (in the app, and on their phones). Never throws. */
export async function notifyTripChanged(before: Trip, after: Trip, actorId: string): Promise<void> {
  try {
    const actor = await UserRepository.findById(actorId);
    const note = tripChangeNote(before, after, actor?.name ?? "Someone");
    if (!note) return;
    const people = new Set([after.userId, ...after.memberIds]);
    people.delete(actorId);
    for (const userId of people) {
      await NotificationRepository.create({ userId, type: "trip_changed", title: note.title, message: note.message, tripId: after.id });
    }
  } catch (err) {
    console.error(`[notify] couldn't tell trip ${after.id}'s people about a change:`, err);
  }
}
