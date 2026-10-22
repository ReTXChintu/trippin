/** SpendLog / InFrame links of a trip — mirrors the backend's suite types. */

export type SuiteApp = "spendlog" | "inframe";
export type SuiteLinkStatus = "pending" | "linked" | "error" | "unlinked";

export interface SuiteSkippedMember {
  sub: string | null;
  email: string;
  reason: string;
}

export interface SuiteLink {
  enabled: boolean;
  status: SuiteLinkStatus;
  remoteId?: string;
  url?: string;
  lastError?: string;
  linkedAt?: string;
  skippedMembers?: SuiteSkippedMember[];
}

export type TripLinks = Partial<Record<SuiteApp, SuiteLink>>;

/** Amounts in minor units (paise for INR). */
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

export interface SuitePromo {
  title: string;
  body: string;
  cta: string;
  webUrl: string;
  apkUrl: string | null;
}

export interface ConnectedAppView {
  app: SuiteApp;
  name: "SpendLog" | "InFrame";
  tagline: string;
  enabled: boolean;
  status: SuiteLinkStatus | null;
  url: string | null;
  lastError: string | null;
  linkedAt: string | null;
  skippedMembers: SuiteSkippedMember[];
  hasAccount: boolean | null;
  summary: SpendlogSummary | InframeSummary | null;
  summaryError: string | null;
  promo: SuitePromo | null;
  webUrl: string;
  apkUrl: string | null;
}

export interface TripLinksView {
  canManage: boolean;
  apps: Record<SuiteApp, ConnectedAppView>;
}

/** `true`/`false`, or `{ on: true, attachTo }` to link one of the owner's existing items there. */
export type LinkToggle = boolean | { on: boolean; attachTo?: string };

export interface LinkToggles {
  spendlog?: LinkToggle;
  inframe?: LinkToggle;
}

/** One of the owner's existing SpendLog groups / InFrame events this trip could link to instead of a new one. */
export interface SuiteCandidate {
  id: string;
  name: string;
  /** YYYY-MM-DD, or null when undated. */
  startDate: string | null;
  endDate: string | null;
  archived: boolean;
  /** It held this trip's link before (or holds it now). */
  linkedHere: boolean;
  /** SpendLog: transactions, members. InFrame: photos, videos, members. */
  counts: Record<string, number>;
  /** SpendLog only: payments linking adds, and automatic ones outside the trip's dates that leave. */
  impact: { added: number; leaving: number } | null;
}
