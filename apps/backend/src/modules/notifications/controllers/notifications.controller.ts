import type { Request, Response } from "express";
import { sendError, sendOk, sendResult } from "@/lib/response";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/modules/notifications/services/notification.service";

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
