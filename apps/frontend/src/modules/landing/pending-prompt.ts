/** A trip described on the landing page before signing up — kept for the "Describe it" box after
 * login. Session storage only, and every access is guarded (private windows can throw). */
const KEY = "trippin.pendingTripPrompt";

export function savePendingTripPrompt(text: string): void {
  try {
    sessionStorage.setItem(KEY, text);
  } catch {
    /* storage unavailable — the text is simply not carried over */
  }
}

export function peekPendingTripPrompt(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPendingTripPrompt(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
