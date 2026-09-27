import type { IconType } from "react-icons";
import { MdConfirmationNumber, MdHotel, MdLocalTaxi, MdMoreHoriz, MdRestaurant, MdShoppingBag } from "react-icons/md";
import type { ExpenseCategory } from "@/modules/trips/types/trip-extras.types";

export const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; color: string; icon: IconType }> = {
  stay: { label: "Stays", color: "blue", icon: MdHotel },
  transport: { label: "Transport", color: "purple", icon: MdLocalTaxi },
  food: { label: "Food & drink", color: "orange", icon: MdRestaurant },
  activities: { label: "Tickets & activities", color: "green", icon: MdConfirmationNumber },
  shopping: { label: "Shopping", color: "pink", icon: MdShoppingBag },
  other: { label: "Other", color: "gray", icon: MdMoreHoriz },
};
