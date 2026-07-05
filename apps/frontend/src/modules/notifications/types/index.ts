export type NotificationType = "trip_member_left" | "trip_member_added";

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  tripId?: string;
  read: boolean;
  createdAt: string;
}
