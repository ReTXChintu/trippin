import { NotificationRepository } from "@/repositories/notification.repository";
import type { NotificationDTO } from "@/repositories/notification.repository";

export type NotificationActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function getNotifications(
  userId: string,
): Promise<NotificationActionResult<{ notifications: NotificationDTO[]; unreadCount: number }>> {
  const [notifications, unreadCount] = await Promise.all([
    NotificationRepository.findForUser(userId),
    NotificationRepository.countUnread(userId),
  ]);

  return { success: true, data: { notifications, unreadCount } };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<NotificationActionResult> {
  const updated = await NotificationRepository.markRead(notificationId, userId);
  if (!updated) return { success: false, error: "Notification not found" };
  return { success: true };
}

export async function markAllNotificationsRead(userId: string): Promise<NotificationActionResult> {
  await NotificationRepository.markAllRead(userId);
  return { success: true };
}
