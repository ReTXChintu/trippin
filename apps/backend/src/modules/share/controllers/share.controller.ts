import type { Request, Response } from "express";
import { sendOk, sendError } from "@/lib/response";
import { getPublicTrip } from "@/modules/trips/services/trip.service";
import { getPublicItinerary } from "@/modules/itinerary/services/itinerary.service";

export async function getSharedTrip(req: Request, res: Response) {
  const { slug } = req.params;
  const trip = await getPublicTrip(slug);
  if (!trip) {
    return sendError(res, "Shared trip not found", 404);
  }

  const itineraryResult = await getPublicItinerary(slug);
  const itinerary = itineraryResult.success ? (itineraryResult.data?.itinerary ?? null) : null;

  // The SpendLog / InFrame links are for people on the trip, not the public page.
  return sendOk(res, { trip: { ...trip, links: {} }, itinerary });
}
