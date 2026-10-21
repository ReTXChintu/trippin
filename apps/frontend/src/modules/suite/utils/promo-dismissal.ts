import type { SuiteApp } from "@/modules/suite/types/suite.types";

/** A dismissed promo stays hidden for 30 days — across trips, so it's shown sparingly. */
const DISMISS_DAYS = 30;
const key = (app: SuiteApp) => `trippin.suitePromo.${app}.dismissedAt`;

export function isPromoDismissed(app: SuiteApp, now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(key(app)));
    return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissPromo(app: SuiteApp, now = Date.now()) {
  try {
    localStorage.setItem(key(app), String(now));
  } catch {
    // storage unavailable — it just shows again next time
  }
}

/** "₹12,345.50" from minor units. */
export function formatMinor(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
