import { timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { oidcMobileSchema } from "@/modules/auth/validators/auth.validator";
import { signAccessToken, signOidcFlowToken, verifyOidcFlowToken } from "@/lib/jwt";
import {
  OidcError,
  buildAuthorizeUrl,
  buildEndSessionUrl,
  createPkce,
  exchangeCode,
  mobileClientId,
  randomToken,
  verifyIdToken,
  webClientId,
} from "@/lib/oidc";
import { sendError, sendOk } from "@/lib/response";
import type { IUserDocument } from "@/models/User";
import { signInWithOidc } from "@/modules/auth/services/auth.service";

const ACCESS_TOKEN_COOKIE = "access_token";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const FLOW_COOKIE = "oidc_flow";
const FLOW_COOKIE_PATH = "/api/v1/auth/oidc";
const FLOW_MAX_AGE_MS = 10 * 60 * 1000;
const DEFAULT_RETURN_TO = "/dashboard";

function frontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/+$/, "");
}

/**
 * HTTPS-only cookies when the site is served over HTTPS (directly, or behind a local TLS proxy);
 * a plain http:// install needs it off or browsers drop the cookie and nobody stays signed in.
 */
function cookieBase(req: Request): CookieOptions {
  const https = req.secure || [process.env.FRONTEND_URL, process.env.BACKEND_URL].some((u) => (u ?? "").startsWith("https://"));
  return { httpOnly: true, secure: https, sameSite: "lax" };
}

function setAccessTokenCookie(req: Request, res: Response, token: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, { ...cookieBase(req), maxAge: COOKIE_MAX_AGE_MS, path: "/" });
}

/** Only same-site paths: "/trips/1", never "//evil.example" or "https://…". */
function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_RETURN_TO;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) return DEFAULT_RETURN_TO;
  return path.length > 2000 ? DEFAULT_RETURN_TO : path;
}

/** Back to the login page with a reason it can explain, keeping where the user was headed. */
function redirectToLogin(res: Response, code: string, returnTo?: string) {
  const params = new URLSearchParams({ error: code });
  if (returnTo && returnTo !== DEFAULT_RETURN_TO) params.set("callbackUrl", returnTo);
  return res.redirect(302, `${frontendUrl()}/login?${params.toString()}`);
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function sessionFor(user: IUserDocument) {
  const id = user._id.toString();
  const accessToken = await signAccessToken({ sub: id, email: user.email, name: user.name });
  return { accessToken, user: { id, name: user.name, email: user.email, avatar: user.avatar } };
}

/** GET /auth/oidc/start?returnTo=/invite/abc — off to the identity server's sign-in page. */
export async function oidcStart(req: Request, res: Response) {
  const returnTo = safeReturnTo(req.query.returnTo ?? req.query.callbackUrl);
  try {
    const state = randomToken();
    const nonce = randomToken();
    const pkce = createPkce();
    const url = await buildAuthorizeUrl({ state, nonce, codeChallenge: pkce.challenge });
    const flow = await signOidcFlowToken({ state, nonce, verifier: pkce.verifier, returnTo });
    res.cookie(FLOW_COOKIE, flow, { ...cookieBase(req), maxAge: FLOW_MAX_AGE_MS, path: FLOW_COOKIE_PATH });
    return res.redirect(302, url);
  } catch (err) {
    console.error("[oidc] start failed:", err instanceof Error ? err.message : err);
    return redirectToLogin(res, err instanceof OidcError && err.code === "not_configured" ? "not_configured" : "unavailable", returnTo);
  }
}

/** GET /auth/oidc/callback?code&state — the identity server sends the browser back here. */
export async function oidcCallback(req: Request, res: Response) {
  const rawFlow = req.cookies?.[FLOW_COOKIE];
  // One use only, whatever happens next.
  res.clearCookie(FLOW_COOKIE, { ...cookieBase(req), path: FLOW_COOKIE_PATH });

  let flow;
  try {
    if (typeof rawFlow !== "string" || !rawFlow) throw new Error("missing");
    flow = await verifyOidcFlowToken(rawFlow);
  } catch {
    return redirectToLogin(res, "expired");
  }

  const { code, state, error } = req.query;
  if (typeof error === "string") return redirectToLogin(res, error === "access_denied" ? "cancelled" : "failed", flow.returnTo);
  if (typeof state !== "string" || !sameString(state, flow.state)) return redirectToLogin(res, "state", flow.returnTo);
  if (typeof code !== "string" || !code) return redirectToLogin(res, "failed", flow.returnTo);

  try {
    const { idToken } = await exchangeCode({ code, codeVerifier: flow.verifier });
    const claims = await verifyIdToken(idToken, { audience: webClientId(), nonce: flow.nonce });
    const result = await signInWithOidc(claims);
    if (!result.success) return redirectToLogin(res, result.code, flow.returnTo);

    const session = await sessionFor(result.user);
    setAccessTokenCookie(req, res, session.accessToken);
    return res.redirect(302, `${frontendUrl()}${flow.returnTo}`);
  } catch (err) {
    console.warn("[oidc] callback failed:", err instanceof Error ? err.message : err);
    return redirectToLogin(res, err instanceof OidcError ? err.code : "failed", flow.returnTo);
  }
}

/**
 * POST /auth/oidc/mobile { idToken } — the Android app signs in with flutter_appauth (PKCE, public
 * client) and hands over the ID token; we answer with Trippin's own token, as the old login did.
 */
export async function oidcMobile(req: Request, res: Response) {
  const parsed = oidcMobileSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "idToken is required", 400);

  let claims;
  try {
    claims = await verifyIdToken(parsed.data.idToken, { audience: mobileClientId() });
  } catch (err) {
    if (err instanceof OidcError && err.code === "not_configured") {
      console.error("[oidc] mobile sign-in:", err.message);
      return sendError(res, "Sign-in isn't set up on the server yet", 503);
    }
    if (err instanceof OidcError && err.code === "unavailable") return sendError(res, "Can't reach the sign-in server. Try again.", 503);
    return sendError(res, "Sign-in failed — your account couldn't be verified. Try again.", 401);
  }

  const result = await signInWithOidc(claims);
  if (!result.success) return sendError(res, result.error, 403);
  return sendOk(res, await sessionFor(result.user));
}

/**
 * POST /auth/logout → { endSessionUrl } for the web app to follow; GET /auth/logout redirects there
 * itself. Either way Trippin's cookie is gone, and the identity server ends its own session.
 */
export async function logout(req: Request, res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...cookieBase(req), path: "/" });

  let endSessionUrl: string | null = null;
  try {
    endSessionUrl = await buildEndSessionUrl();
  } catch (err) {
    console.warn("[oidc] no end-session URL:", err instanceof Error ? err.message : err);
  }

  if (req.method === "GET") return res.redirect(302, endSessionUrl ?? `${frontendUrl()}/login`);
  return sendOk(res, { message: "Logged out", endSessionUrl });
}
