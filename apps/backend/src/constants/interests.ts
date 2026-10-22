export const INTEREST_CATEGORIES = [
  "History",
  "Culture",
  "Temples",
  "Food",
  "Nature",
  "Adventure",
  "Photography",
  "Shopping",
  "Nightlife",
  "Architecture",
  "Spiritual",
  "Museums",
  "Wildlife",
  "Forts",
  "Lakes",
  "Cafes",
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];
