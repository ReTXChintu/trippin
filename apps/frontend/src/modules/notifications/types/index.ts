export type NotificationType = "trip_member_left" | "trip_member_added" | "trip_member_joined" | "trip_comment" | "trip_changed";

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
