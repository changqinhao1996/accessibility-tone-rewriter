import type { IAccessibilityChecker, AccessibilityCheckerResult } from "./IAccessibilityChecker.js";

/**
 * Elements declared ABSENT from all fixture images.
 * The test oracle (UC2-S06) confirms no generated alt text contains these.
 * Exported so UC2_steps.ts can import and reuse the same constant.
 */
export const ABSENT_ELEMENTS = ["stethoscope", "red cross"];

/**
 * The deterministic canned alt text for the standard fixture image.
 * Passes wcagAltTextCheck() and contains no ABSENT_ELEMENTS.
 */
const DEFAULT_ALT_TEXT =
  "A flowchart showing a step-by-step patient intake process with boxes " +
  "connected by arrows, illustrating the sequence from registration to " +
  "initial assessment.";

/**
 * The deterministic canned alt text when context is provided.
 * Incorporates the context string to make it verifiable.
 */
function buildContextAwareAltText(context: string): string {
  return (
    `A diagram used for: ${context}. ` +
    "The flowchart shows sequential steps connected by arrows, " +
    "illustrating a structured workflow process."
  );
}

/**
 * Deterministic test double for the AccessibilityChecker communicating service.
 *
 * Behavior keyed on imageId:
 *   "default-image-id" (no context)   → returns DEFAULT_ALT_TEXT
 *   "default-image-id" (with context) → returns context-aware alt text
 *   "complex-image-id"                → returns { altText: null, complexityFlag: true }
 *   any other imageId                 → returns DEFAULT_ALT_TEXT (fallback)
 */
export class AccessibilityCheckerDouble implements IAccessibilityChecker {
  async generate(
    imageId: string,
    context?: string
  ): Promise<AccessibilityCheckerResult> {
    // UC2-S04: Complex image detection
    if (imageId === "complex-image-id") {
      return {
        altText: null,
        complexityFlag: true,
      };
    }

    // UC2-S01: Context-aware happy path
    if (context && context.trim().length > 0) {
      return {
        altText: buildContextAwareAltText(context.trim()),
        complexityFlag: false,
      };
    }

    // UC2-S02/S03/S06: Standard happy path
    return {
      altText: DEFAULT_ALT_TEXT,
      complexityFlag: false,
    };
  }
}
