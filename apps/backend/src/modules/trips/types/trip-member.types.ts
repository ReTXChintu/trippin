export interface TripMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
}

/** Added by email before they had an account; joins on their first sign-in with that email. */
export interface PendingTripMember {
  email: string;
  role: "editor" | "viewer";
  invitedAt: string;
}
