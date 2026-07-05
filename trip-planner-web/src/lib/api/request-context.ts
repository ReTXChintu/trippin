import { AsyncLocalStorage } from "node:async_hooks";
import { auth } from "@/lib/auth";

/** When set, REST API handlers impersonate this user for server actions. */
export const apiRequestUserId = new AsyncLocalStorage<string>();

export async function getAuthUserId(): Promise<string | null> {
  const apiUserId = apiRequestUserId.getStore();
  if (apiUserId) return apiUserId;
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function runAsUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return apiRequestUserId.run(userId, fn);
}
