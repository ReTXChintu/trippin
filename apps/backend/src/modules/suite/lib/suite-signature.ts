import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Service-to-service auth between the suite's apps: HMAC-SHA256 over `${timestamp}.${rawBody}`
 * with the secret that app pair shares. GET requests sign the empty string.
 *   x-suite-timestamp: unix seconds
 *   x-suite-signature: sha256=<hex>
 */
export const SUITE_TIMESTAMP_HEADER = "x-suite-timestamp";
export const SUITE_SIGNATURE_HEADER = "x-suite-signature";
/** Requests more than this far from the receiver's clock are refused. */
export const SUITE_MAX_SKEW_SECONDS = 5 * 60;

export function suiteSignature(secret: string, timestamp: number | string, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}

/** The two headers for a request with this body, signed now (or at `nowMs`). */
export function signSuiteRequest(secret: string, rawBody: string, nowMs = Date.now()): Record<string, string> {
  const timestamp = Math.floor(nowMs / 1000);
  return {
    [SUITE_TIMESTAMP_HEADER]: String(timestamp),
    [SUITE_SIGNATURE_HEADER]: suiteSignature(secret, timestamp, rawBody),
  };
}

export type SuiteVerifyResult = { ok: true } | { ok: false; reason: "missing" | "stale" | "mismatch" };

/** Checks a signed request: a fresh timestamp, and the signature compared in constant time. */
export function verifySuiteSignature(
  secret: string,
  timestampHeader: string | undefined | null,
  signatureHeader: string | undefined | null,
  rawBody: string,
  nowMs = Date.now(),
): SuiteVerifyResult {
  if (!secret || !timestampHeader || !signatureHeader) return { ok: false, reason: "missing" };
  if (!/^\d{1,12}$/.test(timestampHeader)) return { ok: false, reason: "stale" };
  if (Math.abs(Math.floor(nowMs / 1000) - Number(timestampHeader)) > SUITE_MAX_SKEW_SECONDS) {
    return { ok: false, reason: "stale" };
  }
  const expected = Buffer.from(suiteSignature(secret, timestampHeader, rawBody));
  const given = Buffer.from(signatureHeader);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}
