"use server";

import { getAuthUserId } from "@/lib/api/request-context";
import { NotificationRepository } from "@/repositories/notification.repository";
import type { NotificationDTO } from "@/repositories/notification.repository";

export type NotificationActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

async function requireUserId(): Promise<string | null> {
  return getAuthUserId();
}

export async function getNotificationsAction(): Promise<
  NotificationActionResult<{ notifications: NotificationDTO[]; unreadCount: number }>
> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const [notifications, unreadCount] = await Promise.all([
    NotificationRepository.findForUser(userId),
    NotificationRepository.countUnread(userId),
  ]);

  return { success: true, data: { notifications, unreadCount } };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const updated = await NotificationRepository.markRead(notificationId, userId);
  if (!updated) return { success: false, error: "Notification not found" };

  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  await NotificationRepository.markAllRead(userId);
  return { success: true };
}
