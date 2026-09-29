import type { IconType } from "react-icons";
import { LuBed, LuCarTaxiFront, LuEllipsis, LuShoppingBag, LuTicket, LuUtensils } from "react-icons/lu";
import type { ExpenseCategory } from "@/modules/trips/types/trip-extras.types";

export const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; short: string; color: string; icon: IconType }> = {
  stay: { short: "Stays", label: "Stays", color: "blue", icon: LuBed },
  transport: { short: "Transport", label: "Transport", color: "purple", icon: LuCarTaxiFront },
  food: { short: "Food", label: "Food & drink", color: "orange", icon: LuUtensils },
  activities: { short: "Activities", label: "Tickets & activities", color: "green", icon: LuTicket },
  shopping: { short: "Shopping", label: "Shopping", color: "pink", icon: LuShoppingBag },
  other: { short: "Other", label: "Other", color: "gray", icon: LuEllipsis },
};
