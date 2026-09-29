import type { IconType } from "react-icons";
import {
  LuBedDouble,
  LuBookOpen,
  LuColumns2,
  LuListChecks,
  LuMap,
  LuMapPin,
  LuPrinter,
  LuShare2,
  LuTicket,
  LuUtensils,
  LuWallet,
} from "react-icons/lu";
import type { TripTabKey } from "@/modules/trips/utils/trip-stage";

export const TRIP_TABS: { key: TripTabKey; label: string; icon: IconType }[] = [
  { key: "plan", label: "Plan", icon: LuMap },
  { key: "places", label: "Places", icon: LuMapPin },
  { key: "stays", label: "Stays", icon: LuBedDouble },
  { key: "food", label: "Food", icon: LuUtensils },
  { key: "bookings", label: "Bookings", icon: LuTicket },
  { key: "budget", label: "Budget", icon: LuWallet },
  { key: "checklist", label: "Checklist", icon: LuListChecks },
  { key: "guide", label: "Guide", icon: LuBookOpen },
];

export const MORE_ICONS = { compare: LuColumns2, print: LuPrinter, share: LuShare2 };
