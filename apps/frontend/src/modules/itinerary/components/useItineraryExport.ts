import { useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { getMealSuggestions, type MealSuggestion } from "@/modules/itinerary/api/itinerary.api";
import { buildItineraryPdfHtml } from "@/modules/itinerary/services/itinerary-pdf.service";
import { getTripPlaces } from "@/modules/places/api/places.api";
import type { Place } from "@/modules/places/types/place.types";
import { getWeather } from "@/modules/trips/api/trips.api";
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

/** Settles after `ms` with undefined, so one slow call can't hold up the PDF. */
function within<T>(promise: Promise<T>, ms = 10000): Promise<T | undefined> {
  return Promise.race([promise.catch(() => undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

/** Prints an HTML page from a hidden frame — the browser's dialog offers "Save as PDF". */
async function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  // Wait for the fonts and the logo, but never more than a few seconds.
  await within(
    Promise.all([
      doc.fonts?.ready,
      ...Array.from(doc.images).map((img) => (img.complete ? undefined : new Promise((r) => ((img.onload = r), (img.onerror = r))))),
    ]),
    4000,
  );
  const win = frame.contentWindow!;
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), 60_000);
}

/** Export actions (calendar, Markdown, text, PDF) — shared by the Export menu, the trip's ⋯ menu
 * and the phone "More" sheet. Every action is a no-op until the plan exists. */
export function useItineraryExport(trip: Trip, itinerary: Itinerary | null | undefined) {
  const toast = useToast();
  const queryClient = useQueryClient();

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

  const print = async () => {
    if (!itinerary) {
      toast({ title: "Nothing to export yet — generate the plan first", status: "warning" });
      return;
    }
    const preparing = toast({ title: "Preparing your PDF…", status: "loading", duration: null });
    try {
      const weatherP = within(queryClient.fetchQuery({ queryKey: ["weather", trip.id], queryFn: () => getWeather(trip.id), staleTime: 1000 * 60 * 60 }));
      const placesP = Promise.all(
        trip.legs.map((leg) =>
          within(queryClient.fetchQuery({ queryKey: ["trip-places", trip.id, "selected", leg.id], queryFn: () => getTripPlaces(trip.id, "selected", leg.id) })),
        ),
      );
      // Meals still to pick: the same nearby ideas the plan shows, a few at a time.
      const open = itinerary.days.flatMap((day) => day.stops.filter((s) => s.stopType === "meal" && !s.placeId).map((stop) => ({ day, stop })));
      const mealIdeas = new Map<string, MealSuggestion[]>();
      for (let i = 0; i < open.length; i += 4) {
        await Promise.all(
          open.slice(i, i + 4).map(async ({ day, stop }) => {
            const res = await within(
              queryClient.fetchQuery({
                queryKey: ["meal-suggestions", trip.id, day.dayNumber, stop.id],
                queryFn: () => getMealSuggestions(trip.id, { dayNumber: day.dayNumber, stopId: stop.id }),
                staleTime: 1000 * 60 * 10,
              }),
              8000,
            );
            const list = res?.suggestions ?? [];
            const good = list.filter((s) => s.openAtMealTime !== false);
            const ideas = [...good.filter((s) => s.source === "nearby"), ...good.filter((s) => s.source !== "nearby")].slice(0, 3);
            if (ideas.length) mealIdeas.set(stop.id, ideas);
          }),
        );
      }
      const [weather, placeLists] = await Promise.all([weatherP, placesP]);
      const places = new Map<string, Place>();
      for (const list of placeLists) for (const p of list?.places ?? []) if (p.googlePlaceId) places.set(p.googlePlaceId, p);

      const html = buildItineraryPdfHtml({
        trip,
        itinerary,
        weather: new Map((weather?.days ?? []).map((w) => [w.date, w])),
        places,
        mealIdeas,
        logoUrl: `${window.location.origin}/brand/logo-64.png`,
      });
      toast.close(preparing);
      await printHtml(html);
    } catch {
      toast.close(preparing);
      toast({ title: "Couldn't build the PDF — try again", status: "error" });
    }
  };

  return { available: Boolean(itinerary), copyMarkdown, downloadText, downloadMarkdown, downloadIcs, print };
}

export type ItineraryExportActions = ReturnType<typeof useItineraryExport>;
