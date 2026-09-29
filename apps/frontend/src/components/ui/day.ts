/** Colour token for day N (1-based) — pins, day badges and route lines. Repeats after 8. */
export function dayToken(dayNumber: number): string {
  return `day.${((Math.max(dayNumber, 1) - 1) % 8) + 1}`;
}
