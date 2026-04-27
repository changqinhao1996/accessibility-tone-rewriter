/**
 * WCAG Alt Text compliance checker (UC2 — A2).
 *
 * A generated Alt Text string is WCAG-compliant if ALL of the following hold:
 *   1. Non-empty string
 *   2. Length ≤ 250 characters
 *   3. Does not consist solely of a prohibited phrase
 *      ("image of", "picture of", "photo of") after trimming
 *   4. Does not begin with a prohibited phrase (case-insensitive)
 *
 * Used by:
 *   - GenerateAltTextService  (persists result to ImageAltText.wcagCompliant)
 *   - UC2_steps.ts            (oracle for UC2-S06)
 */

const PROHIBITED_PHRASES = ["image of", "picture of", "photo of"];

/**
 * Returns true if the provided alt text string passes basic WCAG structural checks.
 */
export function wcagAltTextCheck(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  if (text.length > 250) {
    return false;
  }

  const lower = text.trim().toLowerCase();

  for (const phrase of PROHIBITED_PHRASES) {
    // Fails if the entire string is just the prohibited phrase
    if (lower === phrase) {
      return false;
    }
    // Fails if the string starts with the prohibited phrase
    if (lower.startsWith(phrase + " ") || lower.startsWith(phrase + ",")) {
      return false;
    }
  }

  return true;
}
