/**
 * Seed data utilities for UC1 + UC2 + UC3 acceptance scenarios.
 *
 * Fixture IDs match the seed script in backend/prisma/seed.ts.
 * GUIDELINE_RULE_IDS is imported from AuditCheckerDouble (single source of truth).
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export const FIXTURES = {
  // ── UC1 fixtures ──────────────────────────────────────────
  sessionId: 'default-session-id',
  documentId: 'default-document-id',
  defaultSourceText:
    'Patients presenting with acute respiratory infections should be evaluated ' +
    'using standardized clinical assessment protocols. The physician must perform ' +
    'a comprehensive physical examination, including auscultation of the lungs and ' +
    'assessment of oxygen saturation levels. Appropriate antimicrobial therapy should ' +
    'be initiated based on the suspected etiology, taking into consideration local ' +
    'resistance patterns and patient-specific factors such as age, comorbidities, and ' +
    'allergy history. Follow-up evaluation within 48 to 72 hours is recommended to ' +
    'assess treatment response and adjust the therapeutic regimen as clinically indicated.',
  ambiguousText:
    'AMBIGUOUS_UNSAFE_TEXT — The thing does the other thing but also not. ' +
    'It could mean several contradictory interpretations simultaneously. ' +
    'No clear subject or object can be determined from this passage.',
  emptyText: '',

  // ── UC2 fixtures ──────────────────────────────────────────
  defaultImageId: 'default-image-id',
  complexImageId: 'complex-image-id',
  approvedImageId: 'approved-image-id',
  approvedAltTextId: 'approved-alt-text-id',
  absentElements: ['stethoscope', 'red cross'],

  // ── UC3 fixtures ──────────────────────────────────────────
  /** Standard document with known violations (3 violations, covering 3 rules) */
  violationsDocumentId: 'violations-document-id',
  /** Clean document — checker returns 0 violations */
  cleanDocumentId: 'clean-document-id',
  /** All-severity document — Critical + Serious + Minor violations */
  allSeverityDocumentId: 'all-severity-document-id',
  /** ID that does not exist in the DB — triggers validation_error */
  nonexistentDocumentId: 'nonexistent-id',
};

/**
 * The canonical WCAG 2.2 AA rule IDs used in UC3 fixtures.
 *
 * Imported from AuditCheckerDouble to stay in sync with the backend double.
 * Used as the QR1 oracle in UC3-S06: distinct ruleIds in DB must equal this set.
 */
export const GUIDELINE_RULE_IDS = ['1.1.1', '1.3.1', '1.4.3', '2.1.1', '4.1.2'];

/**
 * Check that the backend is running and healthy.
 */
export async function verifyBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
