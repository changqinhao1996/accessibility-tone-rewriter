import type { IAuditChecker, AuditViolationResult } from "./IAuditChecker.js";

/**
 * The canonical set of WCAG 2.2 AA rule IDs used in all UC3 fixtures.
 *
 * Exported so that:
 *   - seed.ts uses it to create Guideline rows (single source of truth)
 *   - UC3_steps.ts imports it for the QR1 coverage oracle (UC3-S06)
 */
export const GUIDELINE_RULE_IDS = ["1.1.1", "1.3.1", "1.4.3", "2.1.1", "4.1.2"];

// ── Canned violation sets ────────────────────────────────────────────────────

/** Standard violations fixture — covers rules 1.1.1, 1.4.3, 2.1.1 */
const VIOLATIONS_FIXTURE: AuditViolationResult[] = [
  {
    ruleId: "1.1.1",
    severity: "Critical",
    description: "Image is missing an alt attribute.",
  },
  {
    ruleId: "1.4.3",
    severity: "Serious",
    description: "Text contrast ratio is 3.2:1, below the minimum 4.5:1.",
  },
  {
    ruleId: "2.1.1",
    severity: "Minor",
    description: "Interactive element is not reachable via keyboard navigation.",
  },
];

/** Clean document fixture — no violations */
const CLEAN_FIXTURE: AuditViolationResult[] = [];

/** All-severity fixture — one per severity level (UC3-S05) */
const ALL_SEVERITY_FIXTURE: AuditViolationResult[] = [
  {
    ruleId: "1.4.3",
    severity: "Critical",
    description: "Heading contrast ratio critically fails WCAG AA.",
  },
  {
    ruleId: "1.3.1",
    severity: "Serious",
    description: "Form input lacks a programmatically associated label.",
  },
  {
    ruleId: "4.1.2",
    severity: "Minor",
    description: "Button role attribute value is non-standard.",
  },
];

/**
 * Build the coverage fixture: one violation per rule in GUIDELINE_RULE_IDS.
 * Used as the default behavior to satisfy the QR1 oracle (UC3-S06).
 */
function buildCoverageFixture(): AuditViolationResult[] {
  const severities: Array<"Critical" | "Serious" | "Minor"> = [
    "Critical",
    "Serious",
    "Minor",
    "Critical",
    "Serious",
  ];
  return GUIDELINE_RULE_IDS.map((ruleId, i) => ({
    ruleId,
    severity: severities[i % severities.length],
    description: `Fixture violation for WCAG rule ${ruleId}.`,
  }));
}

/**
 * Deterministic test double for the AuditChecker communicating service (UC3).
 *
 * Behavior keyed on documentId:
 *   "violations-document-id"    → coverage fixture (5 violations, 1 per rule — satisfies QR1)
 *   "clean-document-id"         → CLEAN_FIXTURE (0 violations)
 *   "all-severity-document-id"  → ALL_SEVERITY_FIXTURE (Critical + Serious + Minor)
 *   anything else (default)     → coverage fixture (same as violations-document-id)
 */
export class AuditCheckerDouble implements IAuditChecker {
  async audit(
    documentId: string,
    _ruleIds: string[]
  ): Promise<AuditViolationResult[]> {
    switch (documentId) {
      case "violations-document-id":
        // Returns all 5 rules covered — required for QR1 oracle in UC3-S06.
        // S01/S03/S06 only assert count > 0, valid severity, valid ruleId format.
        return buildCoverageFixture();
      case "clean-document-id":
        return CLEAN_FIXTURE;
      case "all-severity-document-id":
        return ALL_SEVERITY_FIXTURE;
      default:
        return buildCoverageFixture();
    }
  }
}

