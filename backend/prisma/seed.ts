import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Seed script for UC1: RewriteContentForTargetAudience.
 *
 * Seeds:
 * - 3 AudienceProfile records (Pediatric, Legal, Layperson)
 * - 1 active Session for the ContentDesigner
 * - 1 default Document with known source text
 */
const connectionString =
  process.env["DIRECT_DATABASE_URL"] ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding UC1 data...");

  // Seed AudienceProfiles (upsert to be idempotent)
  const pediatric = await prisma.audienceProfile.upsert({
    where: { name: "Pediatric" },
    update: {},
    create: {
      name: "Pediatric",
      linguisticRules: {
        maxSentenceLength: 12,
        vocabularyLevel: "basic",
        targetGradeRange: [3, 6],
        avoidJargon: true,
        useActiveVoice: true,
      },
    },
  });

  const legal = await prisma.audienceProfile.upsert({
    where: { name: "Legal" },
    update: {},
    create: {
      name: "Legal",
      linguisticRules: {
        maxSentenceLength: 40,
        vocabularyLevel: "specialized",
        targetGradeRange: [10, 14],
        formalTone: true,
        precisionRequired: true,
      },
    },
  });

  const layperson = await prisma.audienceProfile.upsert({
    where: { name: "Layperson" },
    update: {},
    create: {
      name: "Layperson",
      linguisticRules: {
        maxSentenceLength: 20,
        vocabularyLevel: "common",
        targetGradeRange: [6, 8],
        avoidJargon: true,
        useExamples: true,
      },
    },
  });

  console.log(
    `  AudienceProfiles: ${pediatric.name}, ${legal.name}, ${layperson.name}`
  );

  // Seed active Session
  const session = await prisma.session.upsert({
    where: { id: "default-session-id" },
    update: { active: true },
    create: {
      id: "default-session-id",
      userId: "content-designer-1",
      active: true,
    },
  });

  console.log(`  Session: ${session.id} (user: ${session.userId})`);

  // Seed default Document with known source text
  const defaultDoc = await prisma.document.upsert({
    where: { id: "default-document-id" },
    update: {
      sourceText:
        "Patients presenting with acute respiratory infections should be evaluated " +
        "using standardized clinical assessment protocols. The physician must perform " +
        "a comprehensive physical examination, including auscultation of the lungs and " +
        "assessment of oxygen saturation levels. Appropriate antimicrobial therapy should " +
        "be initiated based on the suspected etiology, taking into consideration local " +
        "resistance patterns and patient-specific factors such as age, comorbidities, and " +
        "allergy history. Follow-up evaluation within 48 to 72 hours is recommended to " +
        "assess treatment response and adjust the therapeutic regimen as clinically indicated.",
    },
    create: {
      id: "default-document-id",
      sessionId: session.id,
      sourceText:
        "Patients presenting with acute respiratory infections should be evaluated " +
        "using standardized clinical assessment protocols. The physician must perform " +
        "a comprehensive physical examination, including auscultation of the lungs and " +
        "assessment of oxygen saturation levels. Appropriate antimicrobial therapy should " +
        "be initiated based on the suspected etiology, taking into consideration local " +
        "resistance patterns and patient-specific factors such as age, comorbidities, and " +
        "allergy history. Follow-up evaluation within 48 to 72 hours is recommended to " +
        "assess treatment response and adjust the therapeutic regimen as clinically indicated.",
    },
  });

  console.log(
    `  Document: ${defaultDoc.id} (${defaultDoc.sourceText.length} chars)`
  );
  console.log("Seeding complete.");
}

main()
  .catch((e: unknown) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
