import type { OpeningPeriod, Place } from "@/modules/places/types/place.types";

/** Minutes since midnight of the date in question. `end` can exceed 1440 for places that stay
 * open past midnight. */
export interface TimeWindow {
  start: number;
  end: number;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FULL_DAY = 24 * 60;

/** 0 = Sunday … 6 = Saturday, matching Google's `period.open.day`. Dates are calendar dates
 * (YYYY-MM-DD) in the destination, so parse as UTC to avoid the server's timezone shifting them. */
export function weekdayOf(date: string): number {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay();
}

export function weekdayName(date: string): string {
  return DAY_NAMES[weekdayOf(date)];
}

function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  const merged: TimeWindow[] = [];
  for (const w of sorted) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) {
      last.end = Math.max(last.end, w.end);
    } else {
      merged.push({ ...w });
    }
  }
  return merged;
}

function windowsFromPeriods(periods: OpeningPeriod[], weekday: number): TimeWindow[] {
  // Google encodes "open 24/7" as a single period opening Sunday 00:00 with no close.
  if (periods.length === 1 && !periods[0].close) {
    return [{ start: 0, end: FULL_DAY }];
  }

  const windows: TimeWindow[] = [];
  for (const period of periods) {
    const openMin = period.open.hour * 60 + period.open.minute;

    if (!period.close) {
      if (period.open.day === weekday) windows.push({ start: openMin, end: FULL_DAY });
      continue;
    }

    const closeMin = period.close.hour * 60 + period.close.minute;
    const dayDiff = (period.close.day - period.open.day + 7) % 7;

    if (period.open.day === weekday) {
      let end = closeMin + dayDiff * FULL_DAY;
      if (end <= openMin) end += FULL_DAY;
      windows.push({ start: openMin, end });
    } else if (period.close.day === weekday && dayDiff >= 1 && closeMin > 0) {
      // Opened the previous evening and still open in the early hours of this date.
      windows.push({ start: 0, end: closeMin });
    }
  }

  return mergeWindows(windows);
}

function normalizeHoursText(text: string): string {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[–—]/g, "-")
    .trim();
}

function parseClock(value: string): { minutes: number; meridiem?: "AM" | "PM" } | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 24 || minutes > 59) return null;
  const meridiem = match[3]?.toUpperCase() as "AM" | "PM" | undefined;
  return { minutes: hours * 60 + minutes, meridiem };
}

function to24h(clock: { minutes: number }, meridiem: "AM" | "PM" | undefined): number {
  if (!meridiem) return clock.minutes;
  let hours = Math.floor(clock.minutes / 60) % 12;
  if (meridiem === "PM") hours += 12;
  return hours * 60 + (clock.minutes % 60);
}

/** Fallback for places cached before structured periods were stored: parses Google's
 * "Monday: 9:00 AM – 12:30 PM, 2:00 – 6:00 PM" style lines. Returns null when unparseable. */
function windowsFromDescriptions(descriptions: string[], weekday: number): TimeWindow[] | null {
  const dayName = DAY_NAMES[weekday].toLowerCase();
  const line = descriptions.find((l) => l.trim().toLowerCase().startsWith(dayName));
  if (!line) return null;

  const body = normalizeHoursText(line.slice(line.indexOf(":") + 1));
  if (/closed/i.test(body)) return [];
  if (/open 24 hours/i.test(body)) return [{ start: 0, end: FULL_DAY }];

  const windows: TimeWindow[] = [];
  for (const range of body.split(",")) {
    const [rawStart, rawEnd] = range.split("-").map((part) => part?.trim());
    if (!rawStart || !rawEnd) continue;

    const endClock = parseClock(rawEnd);
    const startClock = parseClock(rawStart);
    if (!endClock || !startClock) return null;

    const end = to24h(endClock, endClock.meridiem);
    // "2:00 - 6:00 PM" — the start inherits the end's meridiem unless that puts it after the end.
    let start = to24h(startClock, startClock.meridiem ?? endClock.meridiem);
    if (!startClock.meridiem && endClock.meridiem && start > end) {
      start = to24h(startClock, "AM");
    }

    windows.push({ start, end: end <= start ? end + FULL_DAY : end });
  }

  return windows.length > 0 ? mergeWindows(windows) : null;
}

/** Opening windows for a place on a specific calendar date: `null` = unknown (no hours data),
 * `[]` = closed all day. */
export function getOpenWindowsOnDate(
  place: Pick<Place, "openingPeriods" | "weekdayDescriptions">,
  date: string,
): TimeWindow[] | null {
  const weekday = weekdayOf(date);
  if (place.openingPeriods?.length) return windowsFromPeriods(place.openingPeriods, weekday);
  if (place.weekdayDescriptions?.length) return windowsFromDescriptions(place.weekdayDescriptions, weekday);
  return null;
}

export function isClosedOnDate(place: Pick<Place, "openingPeriods" | "weekdayDescriptions">, date: string): boolean {
  const windows = getOpenWindowsOnDate(place, date);
  return windows !== null && windows.length === 0;
}

export function formatClockMinutes(minutes: number): string {
  const normalized = ((minutes % FULL_DAY) + FULL_DAY) % FULL_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatWindows(windows: TimeWindow[] | null): string | undefined {
  if (windows === null) return undefined;
  if (windows.length === 0) return "Closed";
  if (windows.length === 1 && windows[0].start === 0 && windows[0].end >= FULL_DAY) return "Open 24 hours";
  return windows.map((w) => `${formatClockMinutes(w.start)}–${formatClockMinutes(w.end)}`).join(", ");
}

export interface HoursFit {
  /** When the visit can actually start (may be later than arrival if the place opens later). */
  start: number;
  /** The visit can't happen as planned on this date (closed, or closes before it can finish). */
  unavailable: boolean;
  warning?: string;
}

/** A wait this long for a place to open is worth calling out rather than silently absorbing. */
const NOTABLE_WAIT_MINUTES = 45;

/** Fits a visit of `visitMin` arriving at `arrivalMin` into the place's opening windows. */
export function fitVisitToHours(
  windows: TimeWindow[] | null,
  arrivalMin: number,
  visitMin: number,
  date: string,
): HoursFit {
  if (windows === null) return { start: arrivalMin, unavailable: false };
  if (windows.length === 0) {
    return { start: arrivalMin, unavailable: true, warning: `Closed on ${weekdayName(date)}s` };
  }

  for (const w of windows) {
    const start = Math.max(arrivalMin, w.start);
    if (start + visitMin <= w.end) {
      const wait = start - arrivalMin;
      return {
        start,
        unavailable: false,
        warning: wait >= NOTABLE_WAIT_MINUTES ? `Opens at ${formatClockMinutes(w.start)} — ${wait} min wait` : undefined,
      };
    }
  }

  const partial = windows.find((w) => w.end > arrivalMin);
  if (partial) {
    const start = Math.max(arrivalMin, partial.start);
    return {
      start,
      unavailable: true,
      warning: `Closes at ${formatClockMinutes(partial.end)} — only ${Math.max(partial.end - start, 0)} min there`,
    };
  }

  const last = windows[windows.length - 1];
  return {
    start: arrivalMin,
    unavailable: true,
    warning: `Already closed when you arrive (closes ${formatClockMinutes(last.end)})`,
  };
}
