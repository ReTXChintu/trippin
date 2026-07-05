import type { Request, Response } from "express";
import { sendOk } from "@/lib/response";
import { getTripStats, getUpcomingTrips, getRecentTrips } from "@/modules/trips/services/trip.service";

export async function getDashboard(req: Request, res: Response) {
  const userId = req.user!.sub;
  const [stats, upcomingTrips, recentTrips] = await Promise.all([
    getTripStats(userId),
    getUpcomingTrips(userId),
    getRecentTrips(userId),
  ]);

  return sendOk(res, { stats, upcomingTrips, recentTrips });
}
