import pg from 'pg';
import { FIXTURES } from './seedData';

/**
 * Direct PostgreSQL connection for test DB operations.
 *
 * Uses the same database as the backend but bypasses Prisma
 * to keep the test harness decoupled from backend internals.
 */
const DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';

async function getClient(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

/**
 * Clear all RewriteRequest records.
 * Called before each scenario to ensure clean state.
 */
export async function resetRewriteRequests(): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM "RewriteRequest"');
  } finally {
    await client.end();
  }
}

/**
 * Reset the default document to its standard source text.
 * Called before each scenario to ensure the default fixture is in place.
 */
export async function resetDocumentToDefault(): Promise<void> {
  const client = await getClient();
  try {
    // Delete any non-default documents
    await client.query('DELETE FROM "Document" WHERE id != $1', [
      FIXTURES.documentId,
    ]);

    // Reset default document's source text
    await client.query(
      'UPDATE "Document" SET "sourceText" = $1 WHERE id = $2',
      [FIXTURES.defaultSourceText, FIXTURES.documentId]
    );
  } finally {
    await client.end();
  }
}

/**
 * Replace the default document's source text with ambiguous text.
 * Used by UC1-S03.
 */
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

/**
 * Replace the default document's source text with empty string.
 * Used by UC1-S04.
 */
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

/**
 * Count RewriteRequest records with a given status.
 */
export async function countRewriteRequests(
  status?: string
): Promise<number> {
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
