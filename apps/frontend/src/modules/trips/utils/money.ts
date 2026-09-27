/** "₹3,200" / "$45.50" — falls back to "INR 3,200" for codes the browser doesn't know. */
export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: opts.compact || Number.isInteger(amount) ? 0 : 2,
      notation: opts.compact ? "compact" : "standard",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export const COMMON_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "LKR", "NPR", "MYR", "IDR", "VND"];
