/** Currency conversion via free, keyless APIs: Frankfurter (ECB rates) first, open.er-api.com for
 * currencies the ECB doesn't publish (AED, VND, …). Rates are cached for 12 hours. */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; rate: number }>();

async function fromFrankfurter(from: string, to: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { rates?: Record<string, number> };
    return data.rates?.[to] ?? null;
  } catch {
    return null;
  }
}

async function fromOpenErApi(from: string, to: string): Promise<number | null> {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { result?: string; rates?: Record<string, number> };
    return data.result === "success" ? (data.rates?.[to] ?? null) : null;
  } catch {
    return null;
  }
}

/** How many `to` one unit of `from` buys. Null if no source knows the pair. */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  if (a === b) return 1;

  const key = `${a}>${b}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rate;

  const rate = (await fromFrankfurter(a, b)) ?? (await fromOpenErApi(a, b));
  if (rate !== null) cache.set(key, { at: Date.now(), rate });
  return rate;
}

/** Converts, rounding to 2 decimals. Null when the rate is unavailable. */
export async function convertAmount(amount: number, from: string, to: string): Promise<{ value: number; rate: number } | null> {
  const rate = await getExchangeRate(from, to);
  if (rate === null) return null;
  return { value: Math.round(amount * rate * 100) / 100, rate };
}
