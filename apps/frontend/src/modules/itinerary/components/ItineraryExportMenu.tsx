import { Button, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { LuCalendar, LuChevronDown, LuCopy, LuDownload, LuPrinter } from "react-icons/lu";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { useItineraryExport, type ItineraryExportActions } from "./useItineraryExport";

interface ItineraryExportMenuProps {
  trip: Trip;
  itinerary: Itinerary;
  size?: "sm" | "md";
}

/** The export actions as menu items, for any <MenuList>. */
export function ItineraryExportItems({ actions }: { actions: ItineraryExportActions }) {
  return (
    <>
      <MenuItem icon={<LuCalendar />} onClick={actions.downloadIcs}>
        Add to calendar (.ics)
      </MenuItem>
      <MenuItem icon={<LuCopy />} onClick={() => void actions.copyMarkdown()}>
        Copy as Markdown
      </MenuItem>
      <MenuItem icon={<LuDownload />} onClick={actions.downloadMarkdown}>
        Download Markdown
      </MenuItem>
      <MenuItem icon={<LuDownload />} onClick={actions.downloadText}>
        Download text
      </MenuItem>
      <MenuItem icon={<LuPrinter />} onClick={() => void actions.print()}>
        Download PDF
      </MenuItem>
    </>
  );
}

export function ItineraryExportMenu({ trip, itinerary, size = "md" }: ItineraryExportMenuProps) {
  const actions = useItineraryExport(trip, itinerary);
  return (
    <Menu placement="bottom-end">
      <MenuButton as={Button} leftIcon={<LuPrinter />} rightIcon={<LuChevronDown />} size={size} variant="outline">
        Export
      </MenuButton>
      <MenuList fontSize="13px">
        <ItineraryExportItems actions={actions} />
      </MenuList>
    </Menu>
  );
}
