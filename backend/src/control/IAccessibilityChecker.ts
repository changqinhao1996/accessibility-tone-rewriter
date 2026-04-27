/**
 * Interface for the AccessibilityChecker communicating service (UC2).
 *
 * Production implementations call an external vision/AI service.
 * Test doubles return deterministic canned responses keyed on imageId.
 */

export interface AccessibilityCheckerResult {
  altText: string | null;
  complexityFlag: boolean;
}

export interface IAccessibilityChecker {
  generate(imageId: string, context?: string): Promise<AccessibilityCheckerResult>;
}
