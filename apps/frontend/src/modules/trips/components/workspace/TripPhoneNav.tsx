import { useDisclosure } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuBookOpen, LuListChecks, LuTicket, LuUtensils, LuWallet } from "react-icons/lu";
import type { TripTabKey } from "@/modules/trips/utils/trip-stage";
import { MoreSheet, TripBottomNav } from "./TripTabs";

/**
 * Self-contained phone trip nav (Plan · Places · Today · Stays · More) for pages outside the trip
 * workspace — e.g. `/trips/:id/today`. Every item navigates to the workspace tab. Hidden from `lg` up.
 */
export function TripPhoneNav({ tripId, active = null }: { tripId: string; active?: TripTabKey | null }) {
  const navigate = useNavigate();
  const more = useDisclosure();
  const to = (tab: TripTabKey) => navigate(`/trips/${tripId}?tab=${tab}`);
  const items = [
    { key: "food", icon: LuUtensils, label: "Food", onClick: () => to("food") },
    { key: "bookings", icon: LuTicket, label: "Bookings", onClick: () => to("bookings") },
    { key: "budget", icon: LuWallet, label: "Budget", onClick: () => to("budget") },
    { key: "checklist", icon: LuListChecks, label: "Checklist", onClick: () => to("checklist") },
    { key: "guide", icon: LuBookOpen, label: "Guide", value: "AI local guide", onClick: () => to("guide") },
  ];
  return (
    <>
      <TripBottomNav tab={active} todayHref={`/trips/${tripId}/today`} moreOpen={more.isOpen} onTab={to} onMore={more.onOpen} />
      <MoreSheet isOpen={more.isOpen} onClose={more.onClose} items={items} />
    </>
  );
}
