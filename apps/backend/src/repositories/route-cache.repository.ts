import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { RouteCache, type IRouteHop } from "@/models/RouteCache";
import { ROUTE_CACHE_TTL_DAYS } from "@/constants/google-places";

export interface RouteHop {
  distanceMeters: number;
  durationSeconds: number;
}

export interface CachedRoute {
  overviewPolyline: string;
  hops: RouteHop[];
}

function cacheExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ROUTE_CACHE_TTL_DAYS);
  return expiresAt;
}

/** Cache key is a hash of the ordered waypoint coordinates + travel mode — the same day route
 * with the same stops in the same order and mode always resolves to the same real-world roads. */
export function buildRouteCacheKey(waypoints: { lat: number; lng: number }[], mode: string): string {
  const raw = `${mode}|${waypoints.map((w) => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join("|")}`;
  return createHash("sha1").update(raw).digest("hex");
}

export class RouteCacheRepository {
  static async find(cacheKey: string): Promise<CachedRoute | null> {
    await connectDB();
    const doc = await RouteCache.findOne({ cacheKey, expiresAt: { $gt: new Date() } }).lean();
    if (!doc) return null;
    return { overviewPolyline: doc.overviewPolyline, hops: doc.hops as IRouteHop[] };
  }

  static async upsert(cacheKey: string, route: CachedRoute): Promise<void> {
    await connectDB();
    await RouteCache.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        overviewPolyline: route.overviewPolyline,
        hops: route.hops,
        fetchedAt: new Date(),
        expiresAt: cacheExpiryDate(),
      },
      { upsert: true, returnDocument: "after" },
    );
  }
}
