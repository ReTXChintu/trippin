// The suite's service-to-service signature: HMAC-SHA256 over `${timestamp}.${rawBody}`.
//   npm test -w apps/backend
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, test } from "node:test";
import {
  SUITE_SIGNATURE_HEADER,
  SUITE_TIMESTAMP_HEADER,
  signSuiteRequest,
  suiteSignature,
  verifySuiteSignature,
} from "@/modules/suite/lib/suite-signature";

const SECRET = "shared-secret";
const NOW = Date.UTC(2026, 9, 21, 12, 0, 0);
const TS = Math.floor(NOW / 1000);

describe("suite signature", () => {
  test("is sha256=<hex> of HMAC(secret, `${timestamp}.${body}`)", () => {
    const body = '{"id":"e1","type":"trip.linked"}';
    const expected = createHmac("sha256", SECRET).update(`${TS}.${body}`).digest("hex");
    assert.equal(suiteSignature(SECRET, TS, body), `sha256=${expected}`);
    assert.match(suiteSignature(SECRET, TS, body), /^sha256=[0-9a-f]{64}$/);
  });

  test("GET requests sign the empty string", () => {
    const expected = createHmac("sha256", SECRET).update(`${TS}.`).digest("hex");
    assert.equal(signSuiteRequest(SECRET, "", NOW)[SUITE_SIGNATURE_HEADER], `sha256=${expected}`);
  });

  test("signSuiteRequest sets the unix-seconds timestamp header", () => {
    const headers = signSuiteRequest(SECRET, "{}", NOW);
    assert.equal(headers[SUITE_TIMESTAMP_HEADER], String(TS));
    assert.deepEqual(Object.keys(headers).sort(), [SUITE_SIGNATURE_HEADER, SUITE_TIMESTAMP_HEADER].sort());
  });

  test("a signed request verifies", () => {
    const body = '{"a":1}';
    const h = signSuiteRequest(SECRET, body, NOW);
    assert.deepEqual(verifySuiteSignature(SECRET, h[SUITE_TIMESTAMP_HEADER], h[SUITE_SIGNATURE_HEADER], body, NOW), { ok: true });
  });

  test("a changed body, another secret, or a moved timestamp fails", () => {
    const body = '{"a":1}';
    const h = signSuiteRequest(SECRET, body, NOW);
    const ts = h[SUITE_TIMESTAMP_HEADER];
    const sig = h[SUITE_SIGNATURE_HEADER];
    assert.deepEqual(verifySuiteSignature(SECRET, ts, sig, '{"a":2}', NOW), { ok: false, reason: "mismatch" });
    assert.deepEqual(verifySuiteSignature("other-secret", ts, sig, body, NOW), { ok: false, reason: "mismatch" });
    assert.deepEqual(verifySuiteSignature(SECRET, String(TS + 1), sig, body, NOW), { ok: false, reason: "mismatch" });
    assert.deepEqual(verifySuiteSignature(SECRET, ts, "sha256=deadbeef", body, NOW), { ok: false, reason: "mismatch" });
  });

  test("timestamps more than 5 minutes off are refused, either way", () => {
    const body = "";
    const at = (offsetSeconds: number) => {
      const h = signSuiteRequest(SECRET, body, NOW + offsetSeconds * 1000);
      return verifySuiteSignature(SECRET, h[SUITE_TIMESTAMP_HEADER], h[SUITE_SIGNATURE_HEADER], body, NOW);
    };
    assert.deepEqual(at(-300), { ok: true });
    assert.deepEqual(at(300), { ok: true });
    assert.deepEqual(at(-301), { ok: false, reason: "stale" });
    assert.deepEqual(at(301), { ok: false, reason: "stale" });
  });

  test("missing or malformed headers are refused", () => {
    assert.deepEqual(verifySuiteSignature(SECRET, undefined, "sha256=x", "", NOW), { ok: false, reason: "missing" });
    assert.deepEqual(verifySuiteSignature(SECRET, String(TS), null, "", NOW), { ok: false, reason: "missing" });
    assert.deepEqual(verifySuiteSignature("", String(TS), "sha256=x", "", NOW), { ok: false, reason: "missing" });
    assert.deepEqual(verifySuiteSignature(SECRET, "12abc", "sha256=x", "", NOW), { ok: false, reason: "stale" });
  });
});
