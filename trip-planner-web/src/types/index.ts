export type TravelStyle = "Relaxed" | "Balanced" | "Fast Paced";

export type TransportationMode =
  | "Walking"
  | "Cab"
  | "Self Drive"
  | "Bike"
  | "Public Transport";

export type TripStatus = "draft" | "active" | "archived" | "completed";

export interface UserPreferences {
  defaultTravelStyle?: TravelStyle;
  defaultTransportation?: TransportationMode;
  interests?: string[];
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface Coordinates {
  lat: number;
  lng: number;
}
