import { SignJWT, jwtVerify } from "jose";

const ISSUER = "itinerary-planner";
const AUDIENCE = "itinerary-planner-mobile";
const EXPIRY = "7d";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or AUTH_SECRET must be configured");
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
