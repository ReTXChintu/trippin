const COUNTRY_CURRENCY: Record<string, string> = {
  india: "INR",
  "united states": "USD",
  usa: "USD",
  "united kingdom": "GBP",
  uk: "GBP",
  japan: "JPY",
  thailand: "THB",
  singapore: "SGD",
  malaysia: "MYR",
  indonesia: "IDR",
  vietnam: "VND",
  "united arab emirates": "AED",
  uae: "AED",
  australia: "AUD",
  canada: "CAD",
  switzerland: "CHF",
  "sri lanka": "LKR",
  nepal: "NPR",
  china: "CNY",
  "south korea": "KRW",
  france: "EUR",
  germany: "EUR",
  italy: "EUR",
  spain: "EUR",
  portugal: "EUR",
  netherlands: "EUR",
  greece: "EUR",
  austria: "EUR",
  ireland: "EUR",
};

/** Sensible default trip currency from the destination country (USD when unknown). */
export function defaultCurrencyFor(country?: string): string {
  return COUNTRY_CURRENCY[(country ?? "").trim().toLowerCase()] ?? "USD";
}
