import fs from "node:fs";
import { SignJWT, importPKCS8 } from "jose";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DeviceToken } from "@/models/DeviceToken";

/**
 * Push notifications to phones, through Firebase Cloud Messaging (HTTP v1).
 *
 * Configured by the Firebase project's service-account key file, named in
 * FIREBASE_SERVICE_ACCOUNT_FILE (the suite shares one project with SpendLog and InFrame). Without
 * it nothing is sent and nothing fails: the in-app notifications are still there.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** For the app to open the right screen: always `type`, and `link` (an app path) where there is one. */
  data: Record<string, string>;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

type Sender = (token: string, message: PushMessage) => Promise<"sent" | "gone" | "failed">;

let account: ServiceAccount | null | undefined;
let accessToken: { value: string; expires: number } | null = null;
let testSender: Sender | null = null;

function serviceAccount(): ServiceAccount | null {
  if (account !== undefined) return account;
  const file = (process.env.FIREBASE_SERVICE_ACCOUNT_FILE ?? "").trim();
  try {
    if (!file) throw new Error("not set");
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error("incomplete");
    account = parsed;
  } catch {
    account = null;
  }
  return account;
}

export function pushAvailable(): boolean {
  return testSender !== null || serviceAccount() !== null;
}

/** Stands in for Firebase in the tests: every send goes to `sender`. Null puts Firebase back. */
export function setPushSenderForTests(sender: Sender | null): void {
  testSender = sender;
}

/** A Google OAuth access token for FCM, from a JWT signed with the service account's key. */
async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  if (accessToken && accessToken.expires > Date.now() + 60_000) return accessToken.value;
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google token endpoint answered ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  accessToken = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

const fcmSender: Sender = async (token, message) => {
  const sa = serviceAccount();
  if (!sa) return "failed";
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await googleAccessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: "HIGH" },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (res?.ok) return "sent";
  // The app was uninstalled or the token rotated: forget it.
  if (res && (res.status === 404 || res.status === 400)) return "gone";
  return "failed";
};

/** Sends to every phone of the user's; tokens Firebase no longer knows are dropped. Never throws. */
export async function pushToUser(userId: string, message: PushMessage): Promise<number> {
  try {
    if (!pushAvailable() || !mongoose.isValidObjectId(userId)) return 0;
    await connectDB();
    const devices = await DeviceToken.find({ userId: new mongoose.Types.ObjectId(userId) }).select({ token: 1 }).lean();
    const send = testSender ?? fcmSender;
    let sent = 0;
    const gone: string[] = [];
    for (const { token } of devices) {
      const result = await send(token, message).catch(() => "failed" as const);
      if (result === "sent") sent += 1;
      else if (result === "gone") gone.push(token);
    }
    if (gone.length > 0) await DeviceToken.deleteMany({ token: { $in: gone } });
    return sent;
  } catch (err) {
    console.error("[push] couldn't send:", err instanceof Error ? err.message : err);
    return 0;
  }
}

/** This phone now belongs to the signed-in user. */
export async function registerDevice(userId: string, token: string, platform = "android"): Promise<void> {
  await connectDB();
  await DeviceToken.updateOne(
    { token },
    { $set: { userId: new mongoose.Types.ObjectId(userId), platform, lastSeenAt: new Date() } },
    { upsert: true },
  );
}

/** Signed out on this phone: no more pushes to it. */
export async function unregisterDevice(userId: string, token: string): Promise<void> {
  await connectDB();
  await DeviceToken.deleteOne({ token, userId: new mongoose.Types.ObjectId(userId) });
}
