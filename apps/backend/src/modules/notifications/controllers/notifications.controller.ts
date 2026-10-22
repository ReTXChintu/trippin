import type { Request, Response } from "express";
import { z } from "zod";
import { sendError, sendOk, sendResult } from "@/lib/response";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/modules/notifications/services/notification.service";
import { registerDevice, unregisterDevice } from "@/modules/notifications/services/push.service";

export async function list(req: Request, res: Response) {
  const result = await getNotifications(req.user!.sub);
  return sendResult(res, result);
}

export async function markAllRead(req: Request, res: Response) {
  const result = await markAllNotificationsRead(req.user!.sub);
  if (!result.success) return sendError(res, result.error, 400);
  return sendOk(res, { message: result.message ?? "OK" });
}

export async function markRead(req: Request, res: Response) {
  const result = await markNotificationRead(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, { message: "Marked as read" });
}

const deviceSchema = z.object({
  token: z.string().trim().min(10).max(4096),
  platform: z.enum(["android", "ios"]).default("android"),
});

/** POST /notifications/devices { token, platform? } — push notifications to this phone. */
export async function addDevice(req: Request, res: Response) {
  const parsed = deviceSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.issues[0]?.message ?? "Invalid token", 400);
  await registerDevice(req.user!.sub, parsed.data.token, parsed.data.platform);
  return sendOk(res, { registered: true });
}

/** DELETE /notifications/devices { token } — signed out on this phone. */
export async function removeDevice(req: Request, res: Response) {
  const parsed = deviceSchema.pick({ token: true }).safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.issues[0]?.message ?? "Invalid token", 400);
  await unregisterDevice(req.user!.sub, parsed.data.token);
  return sendOk(res, { registered: false });
}
