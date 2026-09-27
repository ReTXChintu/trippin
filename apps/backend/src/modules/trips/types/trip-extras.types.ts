export const BOOKING_TYPES = [
  "flight",
  "train",
  "bus",
  "car",
  "ferry",
  "tour",
  "ticket",
  "restaurant",
  "other",
] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

/** Transport bookings can stand in for an inter-city transfer (their times drive that day). */
export const TRANSPORT_BOOKING_TYPES: readonly BookingType[] = ["flight", "train", "bus", "car", "ferry"];

/** A reservation: flight, train, tour, show ticket, table… Dates are local to the destination. */
export interface TripBooking {
  id: string;
  type: BookingType;
  title: string;
  provider?: string;
  confirmationNumber?: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** HH:mm */
  startTime?: string;
  endDate?: string;
  endTime?: string;
  fromPlace?: string;
  toPlace?: string;
  /** The inter-city transfer this booking covers — its times then drive the transfer. */
  transferId?: string;
  cost?: number;
  currency?: string;
  url?: string;
  notes?: string;
}

export const CHECKLIST_CATEGORIES = ["packing", "documents", "todo"] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

export interface ChecklistItem {
  id: string;
  text: string;
  category: ChecklistCategory;
  done: boolean;
  /** YYYY-MM-DD */
  dueDate?: string;
  assigneeId?: string;
}
