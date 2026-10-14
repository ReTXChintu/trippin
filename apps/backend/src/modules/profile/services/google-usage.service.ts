import { createHash } from "node:crypto";
import { GoogleUsage } from "@/models/GoogleUsage";

/** Google Maps Platform SKUs Trippin uses. Free calls reset monthly per SKU; prices are the first
 * paid tier per 1,000 calls (USD) — from Google's pricing page, March 2025 pricing model. */
export const GOOGLE_SKUS = {
  autocomplete: { label: "Place search suggestions (Autocomplete)", tier: "Essentials", freePerMonth: 10_000, usdPer1000: 2.83 },
  textSearchPro: { label: "Text Search Pro", tier: "Pro", freePerMonth: 5_000, usdPer1000: 32 },
  textSearchEnterprise: { label: "Text Search Enterprise", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 35 },
  textSearchAtmosphere: { label: "Text Search Enterprise + Atmosphere", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 40 },
  nearbyPro: { label: "Nearby Search Pro", tier: "Pro", freePerMonth: 5_000, usdPer1000: 32 },
  nearbyEnterprise: { label: "Nearby Search Enterprise", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 35 },
  nearbyAtmosphere: { label: "Nearby Search Enterprise + Atmosphere", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 40 },
  detailsEssentials: { label: "Place Details Essentials", tier: "Essentials", freePerMonth: 10_000, usdPer1000: 5 },
  detailsPro: { label: "Place Details Pro", tier: "Pro", freePerMonth: 5_000, usdPer1000: 17 },
  detailsEnterprise: { label: "Place Details Enterprise", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 20 },
  detailsAtmosphere: { label: "Place Details Enterprise + Atmosphere", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 25 },
  photos: { label: "Place Photos", tier: "Enterprise", freePerMonth: 1_000, usdPer1000: 7 },
  geocoding: { label: "Geocoding", tier: "Essentials", freePerMonth: 10_000, usdPer1000: 5 },
  directions: { label: "Directions (routes between stops)", tier: "Essentials", freePerMonth: 10_000, usdPer1000: 5 },
} as const;

export type GoogleSku = keyof typeof GOOGLE_SKUS;

const ATMOSPHERE_FIELDS = ["editorialSummary", "reviews", "generativeSummary", "reviewSummary"];
const ENTERPRISE_FIELDS = ["rating", "userRatingCount", "priceLevel", "priceRange", "regularOpeningHours", "currentOpeningHours", "websiteUri", "nationalPhoneNumber", "internationalPhoneNumber"];
const PRO_FIELDS = ["displayName", "primaryType", "googleMapsUri", "businessStatus", "photos", "formattedAddress", "location", "types"];

/** Google bills a Places call at the tier of the most expensive field it asks for. */
function tierOf(fieldMask: string, kind: "search" | "details"): "atmosphere" | "enterprise" | "pro" | "essentials" {
  const fields = fieldMask.split(",").map((f) => f.trim().replace(/^places\./, ""));
  if (fields.some((f) => ATMOSPHERE_FIELDS.includes(f))) return "atmosphere";
  if (fields.some((f) => ENTERPRISE_FIELDS.includes(f))) return "enterprise";
  // Address, location, types and photos are Essentials in Place Details but Pro in searches.
  const pro = kind === "details" ? ["displayName", "primaryType", "googleMapsUri", "businessStatus"] : PRO_FIELDS;
  if (fields.some((f) => pro.includes(f))) return "pro";
  return "essentials";
}

/** The SKU a Places API (New) request is billed under, from its URL and field mask. */
export function placesSku(url: string, fieldMask: string): GoogleSku {
  if (url.endsWith(":autocomplete")) return "autocomplete";
  if (url.endsWith(":searchText")) {
    const t = tierOf(fieldMask, "search");
    return t === "atmosphere" ? "textSearchAtmosphere" : t === "enterprise" ? "textSearchEnterprise" : "textSearchPro";
  }
  if (url.endsWith(":searchNearby")) {
    const t = tierOf(fieldMask, "search");
    return t === "atmosphere" ? "nearbyAtmosphere" : t === "enterprise" ? "nearbyEnterprise" : "nearbyPro";
  }
  const t = tierOf(fieldMask, "details");
  return t === "atmosphere" ? "detailsAtmosphere" : t === "enterprise" ? "detailsEnterprise" : t === "pro" ? "detailsPro" : "detailsEssentials";
}

export function keyHash(apiKey: string): string {
  return createHash("sha256").update(apiKey.trim()).digest("hex").slice(0, 32);
}

/** Today in Pacific time — when Google's billing day and month roll over. */
function pacificDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Counts one billed call. Never throws and never delays the request it's counting. */
export function recordGoogleUsage(apiKey: string | undefined, sku: GoogleSku): void {
  if (!apiKey?.trim()) return;
  GoogleUsage.updateOne({ keyHash: keyHash(apiKey), date: pacificDate() }, { $inc: { [`counts.${sku}`]: 1 } }, { upsert: true }).catch(() => undefined);
}

export interface GoogleUsageLine {
  sku: GoogleSku;
  label: string;
  tier: string;
  today: number;
  month: number;
  freePerMonth: number;
  usdPer1000: number;
  /** What this month's calls past the free amount would cost. */
  estimatedUsd: number;
}

export interface GoogleUsageSummary {
  month: string;
  today: string;
  lines: GoogleUsageLine[];
  estimatedUsd: number;
  /** Every SKU with its free amount and price, for the setup guide. */
  pricing: { sku: GoogleSku; label: string; tier: string; freePerMonth: number; usdPer1000: number }[];
}

export async function getGoogleUsageSummary(apiKey: string | undefined): Promise<GoogleUsageSummary> {
  const today = pacificDate();
  const month = today.slice(0, 7);
  const docs = apiKey?.trim() ? await GoogleUsage.find({ keyHash: keyHash(apiKey), date: { $regex: `^${month}` } }).lean() : [];
  const totals = new Map<GoogleSku, { today: number; month: number }>();
  for (const doc of docs) {
    for (const [sku, n] of Object.entries((doc.counts ?? {}) as unknown as Record<string, number>)) {
      if (!(sku in GOOGLE_SKUS)) continue;
      const t = totals.get(sku as GoogleSku) ?? { today: 0, month: 0 };
      t.month += n;
      if (doc.date === today) t.today += n;
      totals.set(sku as GoogleSku, t);
    }
  }
  const lines = [...totals.entries()]
    .map(([sku, t]) => {
      const s = GOOGLE_SKUS[sku];
      const billable = Math.max(0, t.month - s.freePerMonth);
      return { sku, label: s.label, tier: s.tier, ...t, freePerMonth: s.freePerMonth, usdPer1000: s.usdPer1000, estimatedUsd: (billable / 1000) * s.usdPer1000 };
    })
    .sort((a, b) => b.month / b.freePerMonth - a.month / a.freePerMonth);
  return {
    month,
    today,
    lines,
    estimatedUsd: lines.reduce((s, l) => s + l.estimatedUsd, 0),
    pricing: (Object.keys(GOOGLE_SKUS) as GoogleSku[]).map((sku) => ({ sku, ...GOOGLE_SKUS[sku] })),
  };
}
