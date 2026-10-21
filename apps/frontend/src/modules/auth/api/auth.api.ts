import { api } from "@/lib/api";
import type { IUser } from "@/types";

/**
 * Where "Sign in with your account" goes: the backend starts the single sign-on round trip to the
 * identity server and brings the browser back to `returnTo` (a same-site path) once signed in.
 */
export function signInUrl(returnTo: string | null): string {
  const base = String(api.defaults.baseURL ?? "").replace(/\/+$/, "");
  const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return `${base}/auth/oidc/start${query}`;
}

/** Clears Trippin's session; `endSessionUrl` then signs the browser out of the identity server too. */
export async function logout(): Promise<{ endSessionUrl: string | null }> {
  const res = await api.post("/auth/logout");
  return { endSessionUrl: res.data?.data?.endSessionUrl ?? null };
}

export async function getProfile(): Promise<IUser> {
  const res = await api.get("/profile");
  return res.data.data.profile;
}
