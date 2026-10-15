import { useQuery } from "@tanstack/react-query";

/** The Android app published next to this site by the release pipeline (`/trippin.apk`). */
export interface ApkInfo {
  version: string;
  buildNumber: number;
  /** Absolute download URL. */
  url: string;
  releasedAt?: string;
}

/** Null until a release has put the APK on the server — the button hides until then, so nobody
 * downloads the SPA's index.html under the name trippin.apk. */
export function useApkInfo(): ApkInfo | null {
  const { data } = useQuery({
    queryKey: ["apk-info"],
    queryFn: async (): Promise<ApkInfo | null> => {
      try {
        const res = await fetch("/trippin-apk.json", { cache: "no-store" });
        if (!res.ok) return null;
        // With SPA fallback a missing file comes back as index.html with 200.
        const data = (await res.json()) as Partial<ApkInfo>;
        if (typeof data.buildNumber !== "number" || typeof data.version !== "string") return null;
        return { version: data.version, buildNumber: data.buildNumber, url: new URL(data.url || "trippin.apk", window.location.origin).toString(), releasedAt: data.releasedAt };
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
  return data ?? null;
}
