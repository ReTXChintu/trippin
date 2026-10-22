/**
 * The suite: Trippin (the hub), SpendLog (trip money) and InFrame (shared photos). A trip can be
 * linked to a SpendLog trip and/or an InFrame event; both are opt-in, and switching one off only
 * unlinks it — the other side keeps its transactions and photos.
 */

export const SUITE_APPS = ["spendlog", "inframe"] as const;
export type SuiteApp = (typeof SUITE_APPS)[number];

export type SuiteLinkStatus = "pending" | "linked" | "error" | "unlinked";

/** Someone on the trip the other app couldn't add yet; they join once they sign in there. */
export interface SuiteSkippedMember {
  sub: string | null;
  email: string;
  reason: string;
}

/** Trip.links.<app> as stored and as sent to clients. */
export interface SuiteLink {
  enabled: boolean;
  status: SuiteLinkStatus;
  /** The trip/event id on the other side, once it has answered trip.linked. */
  remoteId?: string;
  /** Web URL of the linked trip/event. */
  url?: string;
  lastError?: string;
  linkedAt?: string;
  /** From the last trip.linked / trip.members_changed answer. */
  skippedMembers?: SuiteSkippedMember[];
}

export type TripLinks = Partial<Record<SuiteApp, SuiteLink>>;

export const SUITE_EVENT_TYPES = ["trip.linked", "trip.updated", "trip.members_changed", "trip.unlinked"] as const;
export type SuiteEventType = (typeof SUITE_EVENT_TYPES)[number];

export interface SuitePerson {
  /** Subject on the shared identity server; null only for an account that predates single sign-on. */
  sub: string | null;
  email: string;
  name: string;
}

export interface SuiteTripPayload {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  destination: string;
  url: string;
  owner: SuitePerson;
  members: (SuitePerson & { role: "owner" | "editor" | "viewer" })[];
}

/** The body POSTed to {APP_API_URL}/integrations/trippin/events. */
export interface SuiteEvent {
  id: string;
  type: SuiteEventType;
  occurredAt: string;
  trip: SuiteTripPayload;
  /** trip.linked only: the owner chose this existing group/event there instead of a new one. */
  attachTo?: string;
}

// ---------------------------------------------------------------------------------------------
// Existing items a trip could be linked to (GET {APP_API_URL}/integrations/trippin/candidates)
// ---------------------------------------------------------------------------------------------

export interface SuiteCandidate {
  id: string;
  name: string;
  /** YYYY-MM-DD, or null when undated. */
  startDate: string | null;
  endDate: string | null;
  archived: boolean;
  /** Already holds this trip's link (linked now or before). */
  linkedHere: boolean;
  /** SpendLog: transactions, members. InFrame: photos, videos, members. */
  counts: Record<string, number>;
  /** SpendLog only: payments that linking would add to / take out of it. Null when nothing moves. */
  impact: { added: number; leaving: number } | null;
}

export interface SuiteCandidatesView {
  app: SuiteApp;
  candidates: SuiteCandidate[];
}

// ---------------------------------------------------------------------------------------------
// Live summaries (GET {APP_API_URL}/integrations/trippin/trips/:id/summary?sub=…)
// ---------------------------------------------------------------------------------------------

export interface SpendlogSummary {
  linked: true;
  url: string;
  totalSpentMinor: number;
  currency: string;
  myShareMinor: number;
  iOweMinor: number;
  owedToMeMinor: number;
  settlement: { fromName: string; toName: string; amountMinor: number }[];
  transactionCount: number;
  updatedAt: string;
}

export interface InframeSummary {
  linked: true;
  url: string;
  photoCount: number;
  videoCount: number;
  albumCount: number;
  coverThumbUrl: string | null;
  needsStorage: boolean;
  updatedAt: string;
}

export type SuiteSummary = SpendlogSummary | InframeSummary;

// ---------------------------------------------------------------------------------------------
// GET/PATCH /api/v1/trips/:id/links
// ---------------------------------------------------------------------------------------------

/** Trippin's own card for an app the viewer doesn't use yet, or hasn't linked this trip to. */
export interface SuitePromo {
  title: string;
  body: string;
  /** Button label: "Download SpendLog" / "Install InFrame". */
  cta: string;
  webUrl: string;
  /** Direct APK download, where that's how the app is installed; null otherwise. */
  apkUrl: string | null;
}

export interface ConnectedAppView {
  app: SuiteApp;
  name: "SpendLog" | "InFrame";
  /** One line on what linking does, for toggles. */
  tagline: string;
  enabled: boolean;
  /** Null: never linked. */
  status: SuiteLinkStatus | null;
  /** The linked trip/event on the web ("Open in SpendLog"). */
  url: string | null;
  /** Set with status "error": a refusal to show as-is; the owner can "Try again" (PATCH { app: true }). */
  lastError: string | null;
  linkedAt: string | null;
  /** Members the app couldn't add yet — "2 members will join once they sign in to SpendLog". */
  skippedMembers: SuiteSkippedMember[];
  /** Whether the viewer has an account in that app; null when it couldn't be checked. */
  hasAccount: boolean | null;
  /** Live summary for the viewer; only when linked and reachable. */
  summary: SuiteSummary | null;
  /** E.g. "Couldn't reach SpendLog" — the rest of the page still works. */
  summaryError: string | null;
  /** Set when the app isn't enabled on this trip, or the viewer has no account there. */
  promo: SuitePromo | null;
  /** The app's website and APK, for links that don't depend on the promo. */
  webUrl: string;
  apkUrl: string | null;
}

export interface TripLinksView {
  /** Owners can switch apps on and off. */
  canManage: boolean;
  apps: Record<SuiteApp, ConnectedAppView>;
}
