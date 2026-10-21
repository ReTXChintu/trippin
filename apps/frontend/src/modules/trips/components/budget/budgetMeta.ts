import type { IconType } from "react-icons";
import { LuBed, LuCarTaxiFront, LuEllipsis, LuShoppingBag, LuTicket, LuUtensils } from "react-icons/lu";
import type { ExpenseCategory } from "@/modules/trips/types/trip-extras.types";

/** `color` is the category's slot in the shared chart palette (design system 3.3; Trippin swaps
 * the teal c3 for cobalt). "Other" is always the warm grey, always last. */
export const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; short: string; color: string; icon: IconType }> = {
  stay: { short: "Stays", label: "Stays", color: "c1", icon: LuBed },
  transport: { short: "Transport", label: "Transport", color: "c2", icon: LuCarTaxiFront },
  food: { short: "Food", label: "Food & drink", color: "c3", icon: LuUtensils },
  activities: { short: "Activities", label: "Tickets & activities", color: "c4", icon: LuTicket },
  shopping: { short: "Shopping", label: "Shopping", color: "c5", icon: LuShoppingBag },
  other: { short: "Other", label: "Other", color: "cOther", icon: LuEllipsis },
};
