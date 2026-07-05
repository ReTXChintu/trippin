import { auth } from "@/lib/auth";
import { DashboardContent } from "@/modules/trips/components/DashboardContent";
import {
  getTripStatsAction,
  getUpcomingTripsAction,
  getRecentTripsAction,
} from "@/modules/trips/actions/trip.actions";

export default async function DashboardPage() {
  await auth();

  const [stats, upcomingTrips, recentTrips] = await Promise.all([
    getTripStatsAction(),
    getUpcomingTripsAction(),
    getRecentTripsAction(),
  ]);

  return (
    <DashboardContent
      stats={stats}
      upcomingTrips={upcomingTrips}
      recentTrips={recentTrips}
    />
  );
}
