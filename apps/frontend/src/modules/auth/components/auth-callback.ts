import { useSearchParams } from "react-router-dom";

/** Where to go after auth: only same-site paths are honoured. */
export function useCallbackUrl(): string | null {
  const [params] = useSearchParams();
  const raw = params.get("callbackUrl");
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

export function isInviteCallback(callbackUrl: string | null): boolean {
  return Boolean(callbackUrl?.startsWith("/invite/"));
}
