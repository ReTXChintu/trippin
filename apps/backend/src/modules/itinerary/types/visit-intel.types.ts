export type HypeLevel = "overhyped" | "worth-it" | "hidden-gem";

export interface VisitIntel {
  bestTime?: string;
  avoidTime?: string;
  hypeLevel?: HypeLevel;
  why?: string;
  tips?: string[];
}
