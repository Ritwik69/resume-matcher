/**
 * Shared utility functions.
 */

/** Clamp a number to [min, max] — used to ensure score stays 0-100. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Strip extra whitespace from extracted PDF text before sending to Claude. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
