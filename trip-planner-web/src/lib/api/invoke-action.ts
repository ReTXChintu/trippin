import { runAsUser } from "@/lib/api/request-context";
import { fromActionResult } from "@/lib/api/response";
import type { JwtPayload } from "@/lib/api/jwt";

export async function invokeAsUser<T>(
  auth: JwtPayload,
  fn: () => Promise<T>,
): Promise<T> {
  return runAsUser(auth.sub, fn);
}

export async function invokeAction<T>(
  auth: JwtPayload,
  fn: () => Promise<{ success: true; data?: T; message?: string } | { success: false; error: string }>,
) {
  const result = await runAsUser(auth.sub, fn);
  return fromActionResult(result);
}
