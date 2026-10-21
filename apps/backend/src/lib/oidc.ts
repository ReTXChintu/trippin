import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";

/**
 * Client for the shared OpenID Connect identity server (Trippin, SpendLog and InFrame sign in
 * through it). Discovery and the JWKS are fetched once and cached; ID tokens are RS256.
 *
 *   OIDC_ISSUER            the identity server, e.g. https://id-x.duckdns.org:50011
 *   OIDC_CLIENT_ID         web client (default trippin-web), confidential
 *   OIDC_CLIENT_SECRET     its secret
 *   OIDC_REDIRECT_URI      <backend public URL>/api/v1/auth/oidc/callback
 *   OIDC_POST_LOGOUT_URI   where the identity server sends the browser after sign-out
 *   OIDC_MOBILE_CLIENT_ID  the Android app's public client (default trippin-mobile)
 */

export const OIDC_SCOPES = "openid email profile offline_access";
const DISCOVERY_TTL_MS = 60 * 60 * 1000;

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  token_endpoint_auth_methods_supported?: string[];
}

/** The identity claims Trippin uses from a verified ID token. */
export interface OidcClaims {
  sub: string;
  /** Lower-cased. */
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

/** A sign-in that can't go ahead; `code` goes back to the login page as `?error=`. */
export class OidcError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OidcError";
  }
}

function env(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new OidcError("not_configured", `${key} is not set — sign-in can't work without it.`);
  return value;
}

const trimSlash = (url: string) => url.replace(/\/+$/, "");

export const oidcIssuer = () => trimSlash(env("OIDC_ISSUER"));
export const webClientId = () => process.env.OIDC_CLIENT_ID?.trim() || "trippin-web";
export const mobileClientId = () => process.env.OIDC_MOBILE_CLIENT_ID?.trim() || "trippin-mobile";

// ---------------------------------------------------------------------------------------------
// Discovery + JWKS (cached)
// ---------------------------------------------------------------------------------------------

let discoveryCache: { issuer: string; at: number; doc: Promise<OidcDiscovery> } | null = null;
let jwksCache: { uri: string; jwks: ReturnType<typeof createRemoteJWKSet> } | null = null;

/** Forgets the cached discovery document and keys (tests point OIDC_ISSUER at a stub). */
export function resetOidcCache(): void {
  discoveryCache = null;
  jwksCache = null;
}

async function fetchDiscovery(issuer: string): Promise<OidcDiscovery> {
  const res = await fetch(`${issuer}/.well-known/openid-configuration`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new OidcError("unavailable", `Identity server discovery failed (${res.status})`);
  const doc = (await res.json()) as Partial<OidcDiscovery>;
  if (!doc.issuer || trimSlash(doc.issuer) !== issuer) {
    throw new OidcError("unavailable", `Identity server reports issuer "${doc.issuer}", expected "${issuer}"`);
  }
  for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri"] as const) {
    if (typeof doc[key] !== "string") throw new OidcError("unavailable", `Identity server discovery has no ${key}`);
  }
  return doc as OidcDiscovery;
}

export async function getDiscovery(): Promise<OidcDiscovery> {
  const issuer = oidcIssuer();
  const fresh = discoveryCache && discoveryCache.issuer === issuer && Date.now() - discoveryCache.at < DISCOVERY_TTL_MS;
  if (!fresh) {
    const doc = fetchDiscovery(issuer);
    discoveryCache = { issuer, at: Date.now(), doc };
    // A failed fetch isn't cached — the next sign-in tries again.
    doc.catch(() => {
      if (discoveryCache?.doc === doc) discoveryCache = null;
    });
  }
  return discoveryCache!.doc;
}

function getJwks(uri: string) {
  // jose keeps the keys and refetches on an unknown `kid` (key rotation), with a cooldown.
  if (!jwksCache || jwksCache.uri !== uri) jwksCache = { uri, jwks: createRemoteJWKSet(new URL(uri)) };
  return jwksCache.jwks;
}

// ---------------------------------------------------------------------------------------------
// ID tokens
// ---------------------------------------------------------------------------------------------

/**
 * Verifies signature (JWKS, RS256), issuer, audience, expiry and — for the web flow — the nonce,
 * then returns the claims. Throws OidcError.
 */
export async function verifyIdToken(idToken: string, opts: { audience: string; nonce?: string }): Promise<OidcClaims> {
  const discovery = await getDiscovery();
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, getJwks(discovery.jwks_uri), {
      issuer: discovery.issuer,
      audience: opts.audience,
      algorithms: ["RS256"],
      clockTolerance: 60,
    }));
  } catch (err) {
    if (err instanceof joseErrors.JWTClaimValidationFailed && err.claim === "aud") {
      throw new OidcError("wrong_audience", "This sign-in was issued for a different app");
    }
    throw new OidcError("invalid_token", `ID token rejected: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (opts.nonce !== undefined && payload.nonce !== opts.nonce) {
    throw new OidcError("nonce", "ID token nonce doesn't match this sign-in");
  }
  // Several audiences: the token must have been issued to us (OIDC Core 3.1.3.7).
  if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== opts.audience) {
    throw new OidcError("wrong_audience", "This sign-in was issued for a different app");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!payload.sub || !email) throw new OidcError("missing_email", "Your account has no email address");
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  return {
    sub: payload.sub,
    email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: name || email.split("@")[0],
    picture: typeof payload.picture === "string" && payload.picture ? payload.picture : undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// Web (authorization code + PKCE) flow
// ---------------------------------------------------------------------------------------------

export const randomToken = () => randomBytes(32).toString("base64url");

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomToken();
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export async function buildAuthorizeUrl(params: { state: string; nonce: string; codeChallenge: string }): Promise<string> {
  const discovery = await getDiscovery();
  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: webClientId(),
    redirect_uri: env("OIDC_REDIRECT_URI"),
    scope: OIDC_SCOPES,
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

/** Trades the authorization code for tokens at the token endpoint (confidential client). */
export async function exchangeCode(params: { code: string; codeVerifier: string }): Promise<{ idToken: string }> {
  const discovery = await getDiscovery();
  const clientId = webClientId();
  const secret = env("OIDC_CLIENT_SECRET");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: env("OIDC_REDIRECT_URI"),
    code_verifier: params.codeVerifier,
  });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };

  // client_secret_basic unless the server only takes client_secret_post. Basic credentials are
  // form-encoded first (RFC 6749 §2.3.1).
  const methods = discovery.token_endpoint_auth_methods_supported;
  if (methods && !methods.includes("client_secret_basic") && methods.includes("client_secret_post")) {
    body.set("client_id", clientId);
    body.set("client_secret", secret);
  } else {
    const enc = (s: string) => encodeURIComponent(s).replace(/%20/g, "+");
    headers.Authorization = `Basic ${Buffer.from(`${enc(clientId)}:${enc(secret)}`).toString("base64")}`;
  }

  const res = await fetch(discovery.token_endpoint, { method: "POST", headers, body });
  const json = (await res.json().catch(() => ({}))) as { id_token?: unknown; error?: unknown; error_description?: unknown };
  if (!res.ok) {
    throw new OidcError("token_exchange", `Token exchange failed (${res.status}): ${String(json.error_description ?? json.error ?? "")}`);
  }
  if (typeof json.id_token !== "string") throw new OidcError("token_exchange", "Token response has no id_token");
  return { idToken: json.id_token };
}

/** The identity server's sign-out URL, or null when it doesn't advertise one. */
export async function buildEndSessionUrl(): Promise<string | null> {
  const discovery = await getDiscovery();
  if (!discovery.end_session_endpoint) return null;
  const url = new URL(discovery.end_session_endpoint);
  url.searchParams.set("client_id", webClientId());
  const postLogout = process.env.OIDC_POST_LOGOUT_URI?.trim();
  if (postLogout) url.searchParams.set("post_logout_redirect_uri", postLogout);
  return url.toString();
}
