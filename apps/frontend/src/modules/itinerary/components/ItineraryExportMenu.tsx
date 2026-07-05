import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useToast,
} from "@chakra-ui/react";
import { FiChevronDown, FiCopy, FiDownload, FiPrinter } from "react-icons/fi";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import {
  formatItineraryAsMarkdown,
  formatItineraryAsText,
  getItineraryExportFilename,
} from "@/modules/itinerary/services/itinerary-export.service";

interface ItineraryExportMenuProps {
  trip: Trip;
  itinerary: Itinerary;
  printTargetId?: string;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ItineraryExportMenu({
  trip,
  itinerary,
  printTargetId = "itinerary-print-area",
}: ItineraryExportMenuProps) {
  const toast = useToast();

  const handleCopyMarkdown = async () => {
    const markdown = formatItineraryAsMarkdown(trip, itinerary);
    try {
      await navigator.clipboard.writeText(markdown);
      toast({ title: "Markdown copied to clipboard", status: "success", duration: 3000 });
    } catch {
      toast({ title: "Could not copy to clipboard", status: "error" });
    }
  };

  const handleDownloadText = () => {
    const text = formatItineraryAsText(trip, itinerary);
    downloadFile(getItineraryExportFilename(trip, "txt"), text, "text/plain;charset=utf-8");
    toast({ title: "Itinerary downloaded", status: "success", duration: 3000 });
  };

  const handleDownloadMarkdown = () => {
    const markdown = formatItineraryAsMarkdown(trip, itinerary);
    downloadFile(getItineraryExportFilename(trip, "md"), markdown, "text/markdown;charset=utf-8");
    toast({ title: "Markdown file downloaded", status: "success", duration: 3000 });
  };

  const handlePrint = () => {
    if (!document.getElementById(printTargetId)) {
      toast({ title: "Nothing to print", status: "warning" });
      return;
    }
    window.print();
  };

  return (
    <Menu>
      <MenuButton as={Button} rightIcon={<FiChevronDown />} size="sm" variant="outline">
        Export
      </MenuButton>
      <MenuList>
        <MenuItem icon={<FiCopy />} onClick={handleCopyMarkdown}>
          Copy as Markdown
        </MenuItem>
        <MenuItem icon={<FiDownload />} onClick={handleDownloadMarkdown}>
          Download Markdown
        </MenuItem>
        <MenuItem icon={<FiDownload />} onClick={handleDownloadText}>
          Download Text
        </MenuItem>
        <MenuItem icon={<FiPrinter />} onClick={handlePrint}>
          Print / Save PDF
        </MenuItem>
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
