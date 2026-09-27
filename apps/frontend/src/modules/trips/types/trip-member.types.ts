export interface TripMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
}
