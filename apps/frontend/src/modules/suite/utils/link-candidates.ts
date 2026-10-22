import type { SuiteApp, SuiteCandidate } from "@/modules/suite/types/suite.types";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "16–20 Oct 2026", "From 3 Dec 2026", or null when undated. */
export function candidateDates(c: Pick<SuiteCandidate, "startDate" | "endDate">): string | null {
  if (!c.startDate) return null;
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", opts);
  const full: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (!c.endDate) return `From ${fmt(c.startDate, full)}`;
  const [sy, sm] = c.startDate.split("-");
  const [ey, em] = c.endDate.split("-");
  if (sy === ey && sm === em) return `${Number(c.startDate.slice(8))}–${fmt(c.endDate, full)}`;
  if (sy === ey) return `${fmt(c.startDate, { day: "numeric", month: "short" })} – ${fmt(c.endDate, full)}`;
  return `${fmt(c.startDate, full)} – ${fmt(c.endDate, full)}`;
}

/** "12 payments · 3 people" / "240 photos · 8 videos · 5 people". */
export function candidateCounts(app: SuiteApp, counts: Record<string, number>): string {
  const people = plural(counts.members ?? 0, "person", "people");
  if (app === "spendlog") return `${plural(counts.transactions ?? 0, "payment", "payments")} · ${people}`;
  const videos = counts.videos ?? 0;
  return [plural(counts.photos ?? 0, "photo", "photos"), ...(videos > 0 ? [plural(videos, "video", "videos")] : []), people].join(" · ");
}

/** What linking a candidate changes, or null when nothing moves. */
export function candidateImpact(impact: SuiteCandidate["impact"]): string | null {
  if (!impact) return null;
  const { added, leaving } = impact;
  if (added === 0 && leaving === 0) return "No payments move: everything in it already falls in this trip’s dates.";
  const parts = [
    ...(added > 0 ? [`${plural(added, "payment", "payments")} in this trip’s dates will be added`] : []),
    ...(leaving > 0 ? [`${plural(leaving, "payment", "payments")} outside them will leave the group`] : []),
  ];
  return `${parts.join("; ")}.`;
}
