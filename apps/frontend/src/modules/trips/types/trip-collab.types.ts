export type CommentTarget = "trip" | "stop" | "place";

export interface TripComment {
  id: string;
  targetType: CommentTarget;
  targetId: string;
  targetLabel?: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface InviteLink {
  role: "editor" | "viewer";
  url: string;
  expiresAt: string;
  uses: number;
}

export interface InvitePreview {
  tripId: string;
  tripTitle: string;
  invitedBy: string;
  role: "editor" | "viewer";
  alreadyMember: boolean;
  dates: string;
}
