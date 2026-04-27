@uc3
Feature: UC3 - Audit Document For Accessibility

  # Use case: AuditDocumentForAccessibility
  # Actors: AccessibilityLead (Initiator), AccessibilityChecker (Communicating Service)
  # Goal: Produce a comprehensive WCAG 2.2 AA Audit Report categorised by severity
  #       with specific rule citations for each violation.

  Background:
    Given the AccessibilityLead is logged in
    And a valid document is loaded in the session
    And the AccessibilityChecker service is operational

  # ── Happy Path ──────────────────────────────────────────────

  Scenario: UC3-S01 Audit report is generated and displayed with violations
    Given the document contains known accessibility issues
    When the AccessibilityLead requests a full accessibility audit
    Then the system retrieves WCAG 2.2 AA guidelines
    And the system scans the document and produces an Audit Report
    And the Audit Report is displayed with a list of violations
    And each violation shows a severity level of Critical, Serious, or Minor
    And each violation shows a WCAG rule citation

  Scenario: UC3-S02 Audit report shows no violations for an accessible document
    Given the document has no accessibility issues
    When the AccessibilityLead requests a full accessibility audit
    Then the system scans the document and produces an Audit Report
    And the Audit Report is displayed with no violations listed

  # ── Persistence ─────────────────────────────────────────────

  Scenario: UC3-S03 Completed audit report is persisted to the database
    Given the document contains known accessibility issues
    When the AccessibilityLead requests a full accessibility audit
    Then the Audit Report is persisted with status "complete"
    And the violations are persisted with their severity and rule citation

  # ── Failure / Precondition Scenarios ────────────────────────

  Scenario: UC3-S04 Audit is blocked when no valid document is loaded
    Given no valid document is loaded in the session
    When the AccessibilityLead attempts to request an accessibility audit
    Then the system displays an error indicating no document is available
    And no Audit Report is created in the database

  # ── Severity Categorisation ──────────────────────────────────

  Scenario: UC3-S05 Audit report categorises violations by all three severity levels
    Given the document contains Critical, Serious, and Minor accessibility issues
    When the AccessibilityLead requests a full accessibility audit
    Then the Audit Report displays a Critical violation count
    And the Audit Report displays a Serious violation count
    And the Audit Report displays a Minor violation count
    And no violation has a severity outside Critical, Serious, or Minor

  # ── Quality / NFR ───────────────────────────────────────────

  Scenario: UC3-S06 Audit covers 100% of machine-detectable WCAG 2.2 AA rules
    Given the document contains known accessibility issues
    When the AccessibilityLead requests a full accessibility audit
    Then every WCAG 2.2 AA rule in the Guideline set is evaluated during the audit
