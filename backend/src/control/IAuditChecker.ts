/**
 * Interface for the AuditChecker communicating service (UC3).
 *
 * Production implementations call an external accessibility analysis engine.
 * Test doubles return deterministic canned violations keyed on documentId.
 */

export interface AuditViolationResult {
  /** WCAG 2.2 AA success criterion identifier, e.g. "1.4.3" */
  ruleId: string;
  /** Must be exactly one of: Critical | Serious | Minor (A2) */
  severity: "Critical" | "Serious" | "Minor";
  /** Human-readable description of the violation */
  description: string;
}

export interface IAuditChecker {
  /**
   * Analyse the document against the supplied rule set.
   *
   * @param documentId - ID of the document to scan
   * @param ruleIds    - Full set of WCAG rule IDs from the Guideline table
   * @returns          - Array of violations found (empty = clean document)
   */
  audit(documentId: string, ruleIds: string[]): Promise<AuditViolationResult[]>;
}
