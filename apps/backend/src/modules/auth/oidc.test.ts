// Single sign-on against a stub identity server: a local HTTP server with discovery, a JWKS and a
// token endpoint, signing RS256 ID tokens with a key generated per run. MongoDB is in-memory.
//   npm test -w apps/backend
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const WEB_CLIENT = "trippin-web";
const WEB_SECRET = "test-web-secret";
const MOBILE_CLIENT = "trippin-mobile";
const FRONTEND = "https://trippin.example.test";

let mongo: MongoMemoryServer;
let idp: http.Server;
let api: http.Server;
let issuer = "";
let apiBase = "";
let redirectUri = "";
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let publicJwk: Record<string, unknown>;

/** Codes the stub "issued" at its sign-in page: what the ID token will say, and the PKCE challenge. */
const codes = new Map<string, { claims: Claims; challenge: string; nonce: string }>();

interface Claims {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

const uniq = () => randomBytes(6).toString("hex");

async function signIdToken(claims: Claims & { aud?: string; nonce?: string }): Promise<string> {
  const { aud = WEB_CLIENT, sub, ...rest } = claims;
  return new SignJWT({ ...rest })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setSubject(sub)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

function startIdp(): Promise<void> {
  idp = http.createServer(async (req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const url = new URL(req.url ?? "/", issuer);

    if (url.pathname === "/.well-known/openid-configuration") {
      return json(200, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        end_session_endpoint: `${issuer}/session/end`,
        token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      });
    }
    if (url.pathname === "/jwks") return json(200, { keys: [publicJwk] });

    if (url.pathname === "/token" && req.method === "POST") {
      const params = new URLSearchParams(await readBody(req));
      const expectedAuth = `Basic ${Buffer.from(`${WEB_CLIENT}:${WEB_SECRET}`).toString("base64")}`;
      if (req.headers.authorization !== expectedAuth) return json(401, { error: "invalid_client" });
      const grant = codes.get(params.get("code") ?? "");
      if (!grant || params.get("grant_type") !== "authorization_code") return json(400, { error: "invalid_grant" });
      codes.delete(params.get("code")!);
      const challenge = createHash("sha256").update(params.get("code_verifier") ?? "").digest("base64url");
      if (challenge !== grant.challenge) return json(400, { error: "invalid_grant", error_description: "PKCE" });
      if (params.get("redirect_uri") !== redirectUri) return json(400, { error: "invalid_grant", error_description: "redirect_uri" });
      const idToken = await signIdToken({ ...grant.claims, nonce: grant.nonce });
      return json(200, { access_token: "idp-access", token_type: "Bearer", expires_in: 300, id_token: idToken });
    }

    return json(404, { error: "not_found" });
  });
  return new Promise((resolve) => idp.listen(0, "127.0.0.1", resolve));
}

/** Value of a cookie the response sets (ignoring ones it clears). */
function setCookie(res: Response, name: string): string | null {
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (pair.slice(0, eq).trim() === name) {
      const value = decodeURIComponent(pair.slice(eq + 1));
      return value || null;
    }
  }
  return null;
}

/**
 * The browser's trip: /start → (the identity server's page, simulated) → /callback.
 * `tamper` breaks the state or the nonce the identity server echoes back.
 */
async function webSignIn(claims: Claims, opts: { returnTo?: string; tamper?: "state" | "nonce" } = {}) {
  const start = await fetch(`${apiBase}/auth/oidc/start?returnTo=${encodeURIComponent(opts.returnTo ?? "/dashboard")}`, { redirect: "manual" });
  assert.equal(start.status, 302);
  const authorize = new URL(start.headers.get("location")!);
  const flow = setCookie(start, "oidc_flow");
  assert.ok(flow, "the start sets the flow cookie");

  const code = uniq();
  codes.set(code, {
    claims,
    challenge: authorize.searchParams.get("code_challenge")!,
    nonce: opts.tamper === "nonce" ? "someone-elses-nonce" : authorize.searchParams.get("nonce")!,
  });
  const state = opts.tamper === "state" ? "forged-state" : authorize.searchParams.get("state")!;
  const callback = await fetch(`${apiBase}/auth/oidc/callback?code=${code}&state=${encodeURIComponent(state)}`, {
    redirect: "manual",
    headers: { cookie: `oidc_flow=${flow}` },
  });
  return { authorize, callback, location: callback.headers.get("location") ?? "", accessToken: setCookie(callback, "access_token") };
}

async function mobileSignIn(idToken: string) {
  const res = await fetch(`${apiBase}/auth/oidc/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return { status: res.status, body: (await res.json()) as { success: boolean; data?: any; error?: string } };
}

const authed = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
});

before(async () => {
  mongo = await MongoMemoryServer.create();
  const keys = await generateKeyPair("RS256");
  privateKey = keys.privateKey;
  publicJwk = { ...(await exportJWK(keys.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };

  idp = http.createServer();
  await startIdp();
  issuer = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`;

  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri("trippin-test"),
    JWT_SECRET: "test-jwt-secret-test-jwt-secret-32",
    ENCRYPTION_SECRET: "test-encryption-secret-test-encryption-secret",
    FRONTEND_URL: FRONTEND,
    OIDC_ISSUER: issuer,
    OIDC_CLIENT_ID: WEB_CLIENT,
    OIDC_CLIENT_SECRET: WEB_SECRET,
    OIDC_MOBILE_CLIENT_ID: MOBILE_CLIENT,
    OIDC_POST_LOGOUT_URI: `${FRONTEND}/login`,
  });
  delete process.env.SMTP_HOST;

  const { createApp } = await import("@/app");
  api = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => api.once("listening", resolve));
  apiBase = `http://127.0.0.1:${(api.address() as AddressInfo).port}/api/v1`;
  redirectUri = `${apiBase}/auth/oidc/callback`;
  process.env.OIDC_REDIRECT_URI = redirectUri;
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  await new Promise((r) => api?.close(r));
  await new Promise((r) => idp?.close(r));
});

describe("web sign-in (authorization code + PKCE)", () => {
  test("start → callback creates the user, sets Trippin's cookie and lands on returnTo", async () => {
    const email = `new-${uniq()}@example.com`;
    const { authorize, callback, location, accessToken } = await webSignIn(
      { sub: `sub-${uniq()}`, email, email_verified: true, name: "Asha Rao" },
      { returnTo: "/invite/abc123" },
    );

    assert.equal(`${authorize.origin}${authorize.pathname}`, `${issuer}/authorize`);
    assert.equal(authorize.searchParams.get("client_id"), WEB_CLIENT);
    assert.equal(authorize.searchParams.get("redirect_uri"), redirectUri);
    assert.equal(authorize.searchParams.get("scope"), "openid email profile offline_access");
    assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");

    assert.equal(callback.status, 302);
    assert.equal(location, `${FRONTEND}/invite/abc123`);
    assert.ok(accessToken, "access_token cookie is set");
    const cookieLine = callback.headers.getSetCookie().find((c) => c.startsWith("access_token="))!;
    assert.match(cookieLine, /HttpOnly/i);
    assert.match(cookieLine, /Secure/i, "https FRONTEND_URL → secure cookie");

    const profile = await fetch(`${apiBase}/profile`, { headers: { cookie: `access_token=${accessToken}` } });
    assert.equal(profile.status, 200);
    const body = (await profile.json()) as { data: { profile: { email: string; name: string } } };
    assert.equal(body.data.profile.email, email);
    assert.equal(body.data.profile.name, "Asha Rao");
  });

  test("signing in again finds the same user by subject", async () => {
    const sub = `sub-${uniq()}`;
    const email = `again-${uniq()}@example.com`;
    await webSignIn({ sub, email, email_verified: true });
    await webSignIn({ sub, email, email_verified: true });
    const { User } = await import("@/models/User");
    assert.equal(await User.countDocuments({ oidcSub: sub }), 1);
  });

  test("a verified email links the existing account, keeping its _id", async () => {
    const { User } = await import("@/models/User");
    const email = `existing-${uniq()}@example.com`;
    const existing = await User.create({ name: "Old Account", email, passwordHash: "legacy-hash" });
    const sub = `sub-${uniq()}`;

    const { location, accessToken } = await webSignIn({ sub, email: email.toUpperCase(), email_verified: true, name: "New Name" });
    assert.equal(location, `${FRONTEND}/dashboard`);
    assert.ok(accessToken);

    const linked = await User.findById(existing._id);
    assert.equal(linked?.oidcSub, sub);
    assert.equal(linked?.name, "Old Account", "the Trippin profile name is kept");
    assert.equal(await User.countDocuments({ email }), 1);
  });

  test("an unverified email does not link the existing account", async () => {
    const { User } = await import("@/models/User");
    const email = `unverified-${uniq()}@example.com`;
    const existing = await User.create({ name: "Careful", email, passwordHash: "legacy-hash" });

    const { location, accessToken } = await webSignIn({ sub: `sub-${uniq()}`, email, email_verified: false }, { returnTo: "/trips/1" });
    const to = new URL(location);
    assert.equal(to.pathname, "/login");
    assert.equal(to.searchParams.get("error"), "email_unverified");
    assert.equal(to.searchParams.get("callbackUrl"), "/trips/1");
    assert.equal(accessToken, null);
    assert.equal((await User.findById(existing._id))?.oidcSub, undefined);
  });

  test("a forged state is rejected", async () => {
    const { location, accessToken } = await webSignIn({ sub: `sub-${uniq()}`, email: `s-${uniq()}@example.com`, email_verified: true }, { tamper: "state" });
    assert.equal(new URL(location).searchParams.get("error"), "state");
    assert.equal(accessToken, null);
  });

  test("an ID token with the wrong nonce is rejected", async () => {
    const email = `n-${uniq()}@example.com`;
    const { location, accessToken } = await webSignIn({ sub: `sub-${uniq()}`, email, email_verified: true }, { tamper: "nonce" });
    assert.equal(new URL(location).searchParams.get("error"), "nonce");
    assert.equal(accessToken, null);
    const { User } = await import("@/models/User");
    assert.equal(await User.countDocuments({ email }), 0);
  });

  test("a callback without the flow cookie is rejected", async () => {
    const res = await fetch(`${apiBase}/auth/oidc/callback?code=x&state=y`, { redirect: "manual" });
    assert.equal(new URL(res.headers.get("location")!).searchParams.get("error"), "expired");
  });

  test("returnTo can't point off-site", async () => {
    const start = await fetch(`${apiBase}/auth/oidc/start?returnTo=${encodeURIComponent("//evil.example/x")}`, { redirect: "manual" });
    const flow = setCookie(start, "oidc_flow")!;
    const { verifyOidcFlowToken } = await import("@/lib/jwt");
    assert.equal((await verifyOidcFlowToken(flow)).returnTo, "/dashboard");
  });

  test("logout clears the cookie and hands back the end-session URL", async () => {
    const res = await fetch(`${apiBase}/auth/logout`, { method: "POST" });
    assert.equal(res.status, 200);
    assert.ok(res.headers.getSetCookie().some((c) => c.startsWith("access_token=;")));
    const body = (await res.json()) as { data: { endSessionUrl: string } };
    const url = new URL(body.data.endSessionUrl);
    assert.equal(`${url.origin}${url.pathname}`, `${issuer}/session/end`);
    assert.equal(url.searchParams.get("client_id"), WEB_CLIENT);
    assert.equal(url.searchParams.get("post_logout_redirect_uri"), `${FRONTEND}/login`);
  });
});

describe("mobile sign-in (ID token from flutter_appauth)", () => {
  test("a trippin-mobile ID token gets a Trippin access token", async () => {
    const email = `phone-${uniq()}@example.com`;
    const { status, body } = await mobileSignIn(await signIdToken({ sub: `sub-${uniq()}`, email, email_verified: true, name: "Phone User", aud: MOBILE_CLIENT }));
    assert.equal(status, 200);
    assert.equal(body.data.user.email, email);
    assert.equal(body.data.user.name, "Phone User");
    assert.equal(typeof body.data.user.id, "string");

    const profile = await fetch(`${apiBase}/profile`, authed(body.data.accessToken));
    assert.equal(profile.status, 200);
  });

  test("a token for another audience is refused", async () => {
    const { status, body } = await mobileSignIn(await signIdToken({ sub: `sub-${uniq()}`, email: `aud-${uniq()}@example.com`, email_verified: true, aud: WEB_CLIENT }));
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  test("a token signed by another key is refused", async () => {
    const other = await generateKeyPair("RS256");
    const forged = await new SignJWT({ email: `forged-${uniq()}@example.com`, email_verified: true })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer)
      .setSubject("forged")
      .setAudience(MOBILE_CLIENT)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(other.privateKey);
    assert.equal((await mobileSignIn(forged)).status, 401);
  });
});

describe("adding a trip member by email", () => {
  test("someone without an account is invited, and joins on first sign-in with that verified email", async () => {
    const owner = await mobileSignIn(await signIdToken({ sub: `owner-${uniq()}`, email: `owner-${uniq()}@example.com`, email_verified: true, name: "Owner", aud: MOBILE_CLIENT }));
    const ownerToken: string = owner.body.data.accessToken;

    const { TripRepository } = await import("@/repositories/trip.repository");
    const trip = await TripRepository.create({
      userId: owner.body.data.user.id,
      title: "Goa with friends",
      destinationCity: "Goa",
      destinationCountry: "India",
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-26"),
    });

    const friend = `friend-${uniq()}@example.com`;
    const add = await fetch(`${apiBase}/trips/${trip.id}/members`, authed(ownerToken, { method: "POST", body: JSON.stringify({ email: friend }) }));
    assert.equal(add.status, 200);
    const added = (await add.json()) as { data: { invited: boolean; pending: { email: string }[]; members: unknown[] } };
    assert.equal(added.data.invited, true);
    assert.deepEqual(added.data.pending.map((p) => p.email), [friend]);
    assert.equal(added.data.members.length, 1, "only the owner so far");

    // An unverified sign-in with that address doesn't claim it…
    const impostor = await mobileSignIn(await signIdToken({ sub: `imp-${uniq()}`, email: friend, email_verified: false, aud: MOBILE_CLIENT }));
    assert.equal(impostor.status, 200);
    const { User } = await import("@/models/User");
    await User.deleteOne({ _id: impostor.body.data.user.id });
    let list = (await (await fetch(`${apiBase}/trips/${trip.id}/members`, authed(ownerToken))).json()) as {
      data: { members: { email: string; role: string }[]; pending: unknown[] };
    };
    assert.equal(list.data.pending.length, 1, "still pending");

    // …the real one, verified, does.
    const joined = await mobileSignIn(await signIdToken({ sub: `friend-${uniq()}`, email: friend, email_verified: true, name: "Friend", aud: MOBILE_CLIENT }));
    assert.equal(joined.status, 200);

    list = (await (await fetch(`${apiBase}/trips/${trip.id}/members`, authed(ownerToken))).json()) as typeof list;
    assert.deepEqual(
      list.data.members.map((m) => [m.email, m.role]),
      [
        [owner.body.data.user.email, "owner"],
        [friend, "editor"],
      ],
    );
    assert.equal(list.data.pending.length, 0);

    const friendTrips = await fetch(`${apiBase}/trips/${trip.id}`, authed(joined.body.data.accessToken));
    assert.equal(friendTrips.status, 200, "the new member can open the trip");
  });
});
