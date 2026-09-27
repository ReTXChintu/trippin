/** Distinct, colour-blind-friendly-ish colours for telling days apart on the trip map. */
export const DAY_COLORS = ["#0d9488", "#f97316", "#6366f1", "#e11d48", "#16a34a", "#9333ea", "#0284c7", "#ca8a04", "#db2777", "#475569"];

export function dayColor(index: number): string {
  return DAY_COLORS[index % DAY_COLORS.length];
}
