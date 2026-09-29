/** Trippin' plan helpers — formatting and icon choice shared by the trip workspace. */
import type { IconType } from "react-icons";
import {
  LuBedDouble,
  LuBike,
  LuBus,
  LuCamera,
  LuCar,
  LuCastle,
  LuChurch,
  LuCloud,
  LuCloudFog,
  LuCloudLightning,
  LuCloudRain,
  LuCloudSun,
  LuCompass,
  LuFootprints,
  LuLandmark,
  LuMapPin,
  LuMountain,
  LuMusic,
  LuShoppingBag,
  LuSnowflake,
  LuSun,
  LuTrainFront,
  LuTrees,
  LuUtensils,
  LuWaves,
} from "react-icons/lu";
import type { TransportationMode } from "@/types";

// ---------------------------------------------------------------------------------------------
// Formatting

/** "50 min", "2 h", "1 h 05" — the design's duration style. */
export function fmtDur(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${String(rest).padStart(2, "0")}` : `${h} h`;
}

/** Short word for how you get between stops ("taxi", "walk"). */
export function modeWord(mode: TransportationMode | undefined): string {
  switch (mode) {
    case "Cab":
      return "taxi";
    case "Walking":
      return "walk";
    case "Self Drive":
      return "drive";
    case "Bike":
      return "bike";
    case "Public Transport":
      return "transit";
    default:
      return "";
  }
}

/** Line icon for the travel mode. Short hops (≤ 12 min on foot-able distances) read as walks. */
export function modeIcon(mode: TransportationMode | undefined, walk = false): IconType {
  if (walk || mode === "Walking") return LuFootprints;
  switch (mode) {
    case "Bike":
      return LuBike;
    case "Public Transport":
      return LuBus;
    default:
      return LuCar;
  }
}

/** Category → a line icon for photo fallbacks and category labels. */
export function categoryIcon(category?: string, stopType?: string): IconType {
  if (stopType === "meal" || stopType === "food") return LuUtensils;
  if (stopType === "transfer") return LuTrainFront;
  if (stopType === "return") return LuBedDouble;
  if (stopType === "market") return LuShoppingBag;
  const c = (category ?? "").toLowerCase();
  if (/fort|castle|citadel/.test(c)) return LuCastle;
  if (/palace|museum|monument|landmark|histor|heritage|memorial|gallery|architecture/.test(c)) return LuLandmark;
  if (/temple|church|mosque|shrine|cathedral|gurudwara|religio|spiritual|monastery/.test(c)) return LuChurch;
  if (/lake|river|beach|water|sea|stepwell|kund/.test(c)) return LuWaves;
  if (/park|garden|nature|zoo|forest|wildlife/.test(c)) return LuTrees;
  if (/view|hill|mountain|trek|hike|adventure/.test(c)) return LuMountain;
  if (/market|shop|bazaar|mall/.test(c)) return LuShoppingBag;
  if (/food|restaurant|cafe|café|dining|street/.test(c)) return LuUtensils;
  if (/observ|science|planet/.test(c)) return LuCompass;
  if (/music|show|theat|culture|night/.test(c)) return LuMusic;
  if (/photo|art/.test(c)) return LuCamera;
  return LuMapPin;
}

/** WMO weather code → line icon. */
export function weatherIcon(code: number): IconType {
  if (code <= 1) return LuSun;
  if (code <= 3) return LuCloudSun;
  if (code === 45 || code === 48) return LuCloudFog;
  if (code >= 95) return LuCloudLightning;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return LuSnowflake;
  if (code >= 51) return LuCloudRain;
  return LuCloud;
}

