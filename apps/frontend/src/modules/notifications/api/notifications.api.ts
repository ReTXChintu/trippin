import { api } from "@/lib/api";
import type { NotificationDTO } from "@/modules/notifications/types";

export async function getNotifications(): Promise<{
  notifications: NotificationDTO[];
  unreadCount: number;
}> {
  const res = await api.get("/notifications");
  return res.data.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications");
}
