import { Button, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { LuCalendar, LuChevronDown, LuCopy, LuDownload, LuPrinter } from "react-icons/lu";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { useItineraryExport, type ItineraryExportActions } from "./useItineraryExport";

interface ItineraryExportMenuProps {
  trip: Trip;
  itinerary: Itinerary;
  printTargetId?: string;
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
      <MenuItem icon={<LuPrinter />} onClick={actions.print}>
        Print / Save PDF
      </MenuItem>
    </>
  );
}

export function ItineraryExportMenu({ trip, itinerary, printTargetId = "itinerary-print-area", size = "md" }: ItineraryExportMenuProps) {
  const actions = useItineraryExport(trip, itinerary, printTargetId);
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


export function ItineraryPrintContent({
  trip,
  itinerary,
}: {
  trip: Trip;
  itinerary: Itinerary;
}) {
  return (
    <div id="itinerary-print-area" aria-hidden style={{ display: "none" }}>
      <h1>{trip.title}</h1>
      <p className="print-meta">
        {trip.destinationCity}, {trip.destinationCountry} · {trip.startDate.slice(0, 10)} –{" "}
        {trip.endDate.slice(0, 10)}
      </p>
      {itinerary.summary && (
        <div className="print-summary">
          <h2>Trip Summary</h2>
          <p>{itinerary.summary}</p>
        </div>
      )}
      {itinerary.days.map((day) => (
        <div key={day.dayNumber}>
          <h2>
            Day {day.dayNumber} — {day.date}
            {day.transferLabel ? ` (${day.transferLabel})` : ""}
          </h2>
          {day.stops.length === 0 ? (
            <p className="print-meta">No stops scheduled</p>
          ) : (
            <ol>
              {day.stops.map((stop) => (
                <li key={stop.id}>
                  <strong>{stop.placeName}</strong> — {stop.arrivalTime} to {stop.departureTime}
                  {stop.category ? ` (${stop.category})` : ""}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
