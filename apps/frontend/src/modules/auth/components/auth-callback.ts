import { useSearchParams } from "react-router-dom";

/** Where to go after auth: only same-site paths are honoured. */
export function useCallbackUrl(): string | null {
  const [params] = useSearchParams();
  const raw = params.get("callbackUrl");
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

/** `?callbackUrl=…` to carry the return path between the auth screens. */
export function callbackQuery(callbackUrl: string | null, prefix: "?" | "&" = "?"): string {
  return callbackUrl ? `${prefix}callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
}

export function isInviteCallback(callbackUrl: string | null): boolean {
  return Boolean(callbackUrl?.startsWith("/invite/"));
}


export const authLinkProps = { color: "accent.text", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px" } as const;
