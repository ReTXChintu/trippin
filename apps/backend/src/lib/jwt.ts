import { SignJWT, jwtVerify } from "jose";

const ISSUER = "itinerary-planner";
const AUDIENCE = "itinerary-planner-mobile";
const EXPIRY = "30d";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be configured");
  }
  return new TextEncoder().encode(secret);
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const sub = payload.sub;
  if (!sub || typeof sub !== "string") {
    throw new Error("Invalid token");
  }

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : "",
    name: typeof payload.name === "string" ? payload.name : "",
  };
}

// ---------------------------------------------------------------------------------------------
// OIDC sign-in flow: PKCE verifier, state and nonce carried across the identity server round trip
// in a short-lived signed cookie (nothing stored server-side).
// ---------------------------------------------------------------------------------------------

const FLOW_AUDIENCE = "itinerary-planner-oidc-flow";
const FLOW_EXPIRY = "10m";

export interface OidcFlowPayload {
  state: string;
  nonce: string;
  verifier: string;
  /** Same-site path to land on after sign-in. */
  returnTo: string;
}

export async function signOidcFlowToken(payload: OidcFlowPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(FLOW_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(FLOW_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyOidcFlowToken(token: string): Promise<OidcFlowPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: ISSUER, audience: FLOW_AUDIENCE });
  const { state, nonce, verifier, returnTo } = payload;
  if (typeof state !== "string" || typeof nonce !== "string" || typeof verifier !== "string" || typeof returnTo !== "string") {
    throw new Error("Invalid sign-in flow");
  }
  return { state, nonce, verifier, returnTo };
}
