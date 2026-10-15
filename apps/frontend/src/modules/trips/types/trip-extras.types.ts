export const BOOKING_TYPES = ["flight", "train", "bus", "car", "ferry", "tour", "ticket", "restaurant", "other"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];
export const TRANSPORT_BOOKING_TYPES: readonly BookingType[] = ["flight", "train", "bus", "car", "ferry"];

export interface TripBooking {
  id: string;
  type: BookingType;
  title: string;
  provider?: string;
  confirmationNumber?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  fromPlace?: string;
  toPlace?: string;
  transferId?: string;
  cost?: number;
  currency?: string;
  url?: string;
  notes?: string;
}

export type ChecklistCategory = "packing" | "documents" | "todo";

export interface ChecklistItem {
  id: string;
  text: string;
  category: ChecklistCategory;
  done: boolean;
  dueDate?: string;
  assigneeId?: string;
}

export interface ChecklistSuggestion {
  text: string;
  category: ChecklistCategory;
  reason?: string;
}

export const EXPENSE_CATEGORIES = ["stay", "transport", "food", "activities", "shopping", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  paidBy: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  amountInTripCurrency: number;
  date: string;
  splitWith: string[];
  createdBy: string;
  createdAt: string;
}

export interface BudgetSummary {
  currency: string;
  budgetAmount?: number;
  planned: {
    stays: number;
    bookings: number;
    activities: number;
    total: number;
    unconverted: number;
    nightsWithoutPrice: number;
  };
  spent: { total: number; byCategory: Record<ExpenseCategory, number> };
  members: { id: string; name: string; paid: number; share: number; balance: number }[];
  settlements: { from: string; to: string; amount: number }[];
  expenses: Expense[];
}

export interface DayWeather {
  date: string;
  legId?: string;
  code: number;
  summary: string;
  icon: string;
  tempMaxC: number;
  tempMinC: number;
  rainChance?: number;
  rainMm?: number;
  kind: "forecast" | "typical";
  /** Local time, HH:mm. */
  sunrise?: string;
  sunset?: string;
}
