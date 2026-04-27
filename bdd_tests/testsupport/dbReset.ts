import pg from 'pg';
import { FIXTURES } from './seedData';

/**
 * Direct PostgreSQL connection for test DB operations.
 */
const DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';

async function getClient(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

// ── UC1 Resets ───────────────────────────────────────────────────────────────

export async function resetRewriteRequests(): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM "RewriteRequest"');
  } finally {
    await client.end();
  }
}

export async function resetDocumentToDefault(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      'UPDATE "Document" SET "sourceText" = $1 WHERE id = $2',
      [FIXTURES.defaultSourceText, FIXTURES.documentId]
    );
  } finally {
    await client.end();
  }
}

export async function setDocumentToAmbiguous(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      'UPDATE "Document" SET "sourceText" = $1 WHERE id = $2',
      [FIXTURES.ambiguousText, FIXTURES.documentId]
    );
  } finally {
    await client.end();
  }
}

export async function setDocumentToEmpty(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      'UPDATE "Document" SET "sourceText" = $1 WHERE id = $2',
      ['', FIXTURES.documentId]
    );
  } finally {
    await client.end();
  }
}

export async function countRewriteRequests(status?: string): Promise<number> {
  const client = await getClient();
  try {
    const query = status
      ? 'SELECT COUNT(*) as count FROM "RewriteRequest" WHERE status = $1'
      : 'SELECT COUNT(*) as count FROM "RewriteRequest"';
    const params = status ? [status] : [];
    const result = await client.query(query, params);
    return parseInt(result.rows[0].count, 10);
  } finally {
    await client.end();
  }
}

// ── UC2 Resets ───────────────────────────────────────────────────────────────

export async function resetImageAltTexts(): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM "ImageAltText"');
  } finally {
    await client.end();
  }
}

export async function resetDocumentImages(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      'UPDATE "DocumentImage" SET "hasAltText" = false WHERE id = $1',
      [FIXTURES.defaultImageId]
    );
    await client.query(
      'UPDATE "DocumentImage" SET "hasAltText" = false WHERE id = $1',
      [FIXTURES.complexImageId]
    );
    await client.query(
      'UPDATE "DocumentImage" SET "hasAltText" = true WHERE id = $1',
      [FIXTURES.approvedImageId]
    );
  } finally {
    await client.end();
  }
}

export async function seedApprovedAltText(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO "ImageAltText" (id, "imageId", "altText", "wcagCompliant", approved, status, "createdAt")
       VALUES ($1, $2, $3, true, true, 'success', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        FIXTURES.approvedAltTextId,
        FIXTURES.approvedImageId,
        'Hospital logo showing a blue cross and the organization name.',
      ]
    );
  } finally {
    await client.end();
  }
}

export async function setAllImagesApproved(): Promise<void> {
  const client = await getClient();
  try {
    await client.query(
      'UPDATE "DocumentImage" SET "hasAltText" = true WHERE "documentId" = $1',
      [FIXTURES.documentId]
    );
  } finally {
    await client.end();
  }
}

export async function getApprovedAltText(
  imageId: string
): Promise<{ altText: string; approved: boolean } | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT "altText", approved FROM "ImageAltText" WHERE "imageId" = $1 AND approved = true LIMIT 1',
      [imageId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as { altText: string; approved: boolean };
  } finally {
    await client.end();
  }
}

export async function countImageAltTexts(imageId?: string): Promise<number> {
  const client = await getClient();
  try {
    const query = imageId
      ? 'SELECT COUNT(*) as count FROM "ImageAltText" WHERE "imageId" = $1'
      : 'SELECT COUNT(*) as count FROM "ImageAltText"';
    const params = imageId ? [imageId] : [];
    const result = await client.query(query, params);
    return parseInt(result.rows[0].count, 10);
  } finally {
    await client.end();
  }
}

// ── UC3 Resets ───────────────────────────────────────────────────────────────

/**
 * Delete all AuditViolation rows.
 * Must run before AuditReport deletion due to FK constraint.
 */
export async function resetAuditViolations(): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM "AuditViolation"');
  } finally {
    await client.end();
  }
}

/**
 * Delete all AuditReport rows.
 * Always call resetAuditViolations() first.
 */
export async function resetAuditReports(): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM "AuditReport"');
  } finally {
    await client.end();
  }
}

/**
 * Get the most recent AuditReport for a given documentId.
 */
export async function getLatestAuditReport(
  documentId: string
): Promise<{ id: string; status: string; guidelinesVersion: string } | null> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT id, status, "guidelinesVersion"
       FROM "AuditReport"
       WHERE "documentId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [documentId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as { id: string; status: string; guidelinesVersion: string };
  } finally {
    await client.end();
  }
}

/**
 * Get all AuditViolation rows for a given auditReportId.
 */
export async function getAuditViolations(
  auditReportId: string
): Promise<Array<{ ruleId: string; severity: string; description: string }>> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT "ruleId", severity, description
       FROM "AuditViolation"
       WHERE "auditReportId" = $1`,
      [auditReportId]
    );
    return result.rows as Array<{ ruleId: string; severity: string; description: string }>;
  } finally {
    await client.end();
  }
}

/**
 * Count distinct ruleId values across all AuditViolation rows.
 * Used by the QR1 coverage oracle (UC3-S06).
 */
export async function getDistinctAuditRuleIds(): Promise<string[]> {
  const client = await getClient();
  try {
    const result = await client.query(
      'SELECT DISTINCT "ruleId" FROM "AuditViolation" ORDER BY "ruleId"'
    );
    return result.rows.map((r: { ruleId: string }) => r.ruleId);
  } finally {
    await client.end();
  }
}

/**
 * Count AuditReport rows for a given documentId.
 * Used by UC3-S04 DB oracle.
 */
export async function countAuditReports(documentId?: string): Promise<number> {
  const client = await getClient();
  try {
    const query = documentId
      ? 'SELECT COUNT(*) as count FROM "AuditReport" WHERE "documentId" = $1'
      : 'SELECT COUNT(*) as count FROM "AuditReport"';
    const params = documentId ? [documentId] : [];
    const result = await client.query(query, params);
    return parseInt(result.rows[0].count, 10);
  } finally {
    await client.end();
  }
}
