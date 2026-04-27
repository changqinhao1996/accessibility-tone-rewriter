/**
 * Seed data utilities for UC1 acceptance scenarios.
 *
 * Uses direct HTTP calls to avoid coupling tests to the Prisma client.
 * For scenarios that need DB mutations (ambiguous/empty doc), we call
 * the backend directly or use a test-support endpoint.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Known fixture IDs matching the seed script in backend/prisma/seed.ts.
 */
export const FIXTURES = {
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
};

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
