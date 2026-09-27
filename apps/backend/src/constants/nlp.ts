export const KNOWN_CITIES = [
  { name: "Ajmer", state: "Rajasthan", country: "India" },
  { name: "Pushkar", state: "Rajasthan", country: "India" },
  { name: "Kishangarh", state: "Rajasthan", country: "India" },
  { name: "Jaipur", state: "Rajasthan", country: "India" },
  { name: "Udaipur", state: "Rajasthan", country: "India" },
] as const;

export const INTEREST_KEYWORDS: Record<string, string[]> = {
  History: ["history", "historical", "heritage", "monument"],
  Culture: ["culture", "cultural", "local culture", "tradition"],
  Temples: ["temple", "temples", "dargah", "shrine", "mosque"],
  Food: ["food", "cuisine", "restaurant", "street food", "eating"],
  Nature: ["nature", "natural", "scenic", "landscape"],
  Adventure: ["adventure", "trek", "trekking", "hiking", "outdoor"],
  Photography: ["photography", "photo", "photogenic", "instagram"],
  Shopping: ["shopping", "market", "bazaar", "souvenir"],
  Nightlife: ["nightlife", "bar", "club", "night"],
  Architecture: ["architecture", "architectural", "building"],
  Spiritual: ["spiritual", "meditation", "pilgrimage", "peaceful"],
  Museums: ["museum", "museums", "gallery"],
  Wildlife: ["wildlife", "safari", "animals", "bird"],
  Forts: ["fort", "forts", "fortress", "palace"],
  Lakes: ["lake", "lakes", "waterfront"],
  Cafes: ["cafe", "cafes", "coffee"],
};

export const TRAVEL_STYLE_KEYWORDS: Record<string, string[]> = {
  Relaxed: ["relaxed", "leisurely", "slow", "easy", "laid back", "laid-back"],
  "Fast Paced": ["fast paced", "fast-paced", "packed", "intense", "quick"],
  Balanced: ["balanced", "moderate", "normal"],
};

export const COMPANION_KEYWORDS: Record<string, string[]> = {
  parents: ["parents", "parent", "mother", "father", "elderly", "senior"],
  family: ["family", "kids", "children", "child"],
  couple: ["couple", "partner", "wife", "husband", "honeymoon"],
  friends: ["friends", "friend", "group"],
  solo: ["solo", "alone", "myself", "by myself"],
};

export const HOTEL_AREA_PATTERNS = [
  /(?:staying|stay|stayed)\s+(?:near|at|in|around)\s+([^.!,]+)/i,
  /(?:near|around|close to)\s+([^.!,]+?)(?:\s+for|\s+with|,|\.|$)/i,
  /hotel\s+(?:near|at|in)\s+([^.!,]+)/i,
];

export const DURATION_PATTERNS = [
  /(\d+)\s*days?/i,
  /(\d+)\s*day\s*trip/i,
  /for\s+(\d+)\s*days?/i,
];

export const DEFAULT_COUNTRY = "India";
export const DEFAULT_STATE = "Rajasthan";
