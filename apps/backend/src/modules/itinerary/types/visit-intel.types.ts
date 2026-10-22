export type HypeLevel = "overhyped" | "worth-it" | "hidden-gem";

export interface VisitIntel {
  bestTime?: string;
  avoidTime?: string;
  hypeLevel?: HypeLevel;
  why?: string;
  tips?: string[];
  /** Typical entry fee, e.g. "Free" or "₹50 Indians / ₹600 foreigners" — AI-estimated. */
  entryFee?: string;
}
