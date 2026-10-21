import type { SuiteApp, SuitePromo } from "@/modules/suite/types/suite.types";

/** How Trippin reaches one of the suite's apps; read from env on every call so tests can set it. */
export interface SuiteAppConfig {
  app: SuiteApp;
  name: "SpendLog" | "InFrame";
  /** API base, e.g. https://spend-log.duckdns.org:50002/api; null when not configured. */
  apiUrl: string | null;
  /** Shared HMAC secret for Trippin ↔ this app; null when not configured. */
  secret: string | null;
  webUrl: string;
  apkUrl: string | null;
  tagline: string;
  promo: Omit<SuitePromo, "webUrl" | "apkUrl">;
}

const trimSlash = (value: string) => value.replace(/\/+$/, "");
const env = (name: string) => process.env[name]?.trim() || null;

export function suiteAppConfig(app: SuiteApp): SuiteAppConfig {
  if (app === "spendlog") {
    const webUrl = trimSlash(env("SPENDLOG_WEB_URL") ?? "https://spend-log.duckdns.org:50002");
    return {
      app,
      name: "SpendLog",
      apiUrl: env("SPENDLOG_API_URL") ? trimSlash(env("SPENDLOG_API_URL")!) : null,
      secret: env("SPENDLOG_SUITE_SECRET"),
      webUrl,
      apkUrl: env("SPENDLOG_APK_URL") ?? `${webUrl}/SpendLog.apk`,
      tagline: "Creates a SpendLog trip for everyone on this trip — log, split and settle what you actually spend.",
      promo: {
        title: "Download SpendLog to analyse your trip spending smartly",
        body: "Log expenses as you go, split them with your travel group and see who owes whom — next to this trip's planned budget.",
        cta: "Download SpendLog",
      },
    };
  }
  const webUrl = trimSlash(env("INFRAME_WEB_URL") ?? "https://in-frame.duckdns.org:50010");
  return {
    app,
    name: "InFrame",
    apiUrl: env("INFRAME_API_URL") ? trimSlash(env("INFRAME_API_URL")!) : null,
    secret: env("INFRAME_SUITE_SECRET"),
    webUrl,
    apkUrl: env("INFRAME_APK_URL") ?? `${webUrl}/inframe.apk`,
    tagline: "Creates a shared InFrame event so everyone's photos from this trip land in one album.",
    promo: {
      title: "Install InFrame to save your trip's memories forever",
      body: "One shared album for the whole group — everyone's photos and videos from this trip, kept in one place.",
      cta: "Install InFrame",
    },
  };
}

export function suitePromo(config: SuiteAppConfig): SuitePromo {
  return { ...config.promo, webUrl: config.webUrl, apkUrl: config.apkUrl };
}

/** The public URL of a trip in Trippin's web app, sent to the other apps for their back-links. */
export function trippinTripUrl(tripId: string): string {
  return `${trimSlash(process.env.FRONTEND_URL ?? "http://localhost:5173")}/trips/${tripId}`;
}
