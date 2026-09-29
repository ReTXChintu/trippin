import { useToast } from "@chakra-ui/react";
import { formatItineraryAsIcs } from "@/modules/itinerary/services/itinerary-ics.service";
import {
  formatItineraryAsMarkdown,
  formatItineraryAsText,
  getItineraryExportFilename,
} from "@/modules/itinerary/services/itinerary-export.service";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Export actions (calendar, Markdown, text, print) — shared by the Export menu, the trip's ⋯ menu
 * and the phone "More" sheet. Every action is a no-op until the plan exists. */
export function useItineraryExport(trip: Trip, itinerary: Itinerary | null | undefined, printTargetId = "itinerary-print-area") {
  const toast = useToast();

  const copyMarkdown = async () => {
    if (!itinerary) return;
    const markdown = formatItineraryAsMarkdown(trip, itinerary);
    try {
      await navigator.clipboard.writeText(markdown);
      toast({ title: "Markdown copied to clipboard", status: "success", duration: 3000 });
    } catch {
      toast({ title: "Could not copy to clipboard", status: "error" });
    }
  };

  const downloadText = () => {
    if (!itinerary) return;
    const text = formatItineraryAsText(trip, itinerary);
    downloadFile(getItineraryExportFilename(trip, "txt"), text, "text/plain;charset=utf-8");
    toast({ title: "Itinerary downloaded", status: "success", duration: 3000 });
  };

  const downloadMarkdown = () => {
    if (!itinerary) return;
    const markdown = formatItineraryAsMarkdown(trip, itinerary);
    downloadFile(getItineraryExportFilename(trip, "md"), markdown, "text/markdown;charset=utf-8");
    toast({ title: "Markdown file downloaded", status: "success", duration: 3000 });
  };

  const downloadIcs = () => {
    if (!itinerary) return;
    downloadFile(getItineraryExportFilename(trip, "ics"), formatItineraryAsIcs(trip, itinerary), "text/calendar;charset=utf-8");
    toast({ title: "Calendar file downloaded", description: "Open it to add every stop to your calendar.", status: "success", duration: 3000 });
  };

  const print = () => {
    if (!itinerary || !document.getElementById(printTargetId)) {
      toast({ title: "Nothing to print yet — generate the plan first", status: "warning" });
      return;
    }
    window.print();
  };

  return { available: Boolean(itinerary), copyMarkdown, downloadText, downloadMarkdown, downloadIcs, print };
}

export type ItineraryExportActions = ReturnType<typeof useItineraryExport>;
