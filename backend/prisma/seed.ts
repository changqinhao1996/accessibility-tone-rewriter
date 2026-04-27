import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { GUIDELINE_RULE_IDS } from "../src/control/AuditCheckerDouble.js";

/**
 * Seed script for UC1 + UC2 + UC3.
 *
 * Seeds:
 * - 3 AudienceProfile records (UC1)
 * - 1 active Session
 * - 1 default Document with known source text (UC1)
 * - 3 DocumentImage fixtures (UC2)
 * - 1 approved ImageAltText for approved-image-id (UC2-S05)
 * - 5 Guideline records — WCAG 2.2 AA rules (UC3)
 * - 3 Document fixtures for UC3 audit scenarios
 */
const connectionString =
  process.env["DIRECT_DATABASE_URL"] ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── UC1 Seed ─────────────────────────────────────────────────────────────
  console.log("Seeding UC1 data...");

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

  const defaultSourceText =
    "Patients presenting with acute respiratory infections should be evaluated " +
    "using standardized clinical assessment protocols. The physician must perform " +
    "a comprehensive physical examination, including auscultation of the lungs and " +
    "assessment of oxygen saturation levels. Appropriate antimicrobial therapy should " +
    "be initiated based on the suspected etiology, taking into consideration local " +
    "resistance patterns and patient-specific factors such as age, comorbidities, and " +
    "allergy history. Follow-up evaluation within 48 to 72 hours is recommended to " +
    "assess treatment response and adjust the therapeutic regimen as clinically indicated.";

  const defaultDoc = await prisma.document.upsert({
    where: { id: "default-document-id" },
    update: { sourceText: defaultSourceText },
    create: {
      id: "default-document-id",
      sessionId: session.id,
      sourceText: defaultSourceText,
    },
  });

  console.log(
    `  Document: ${defaultDoc.id} (${defaultDoc.sourceText.length} chars)`
  );

  // ── UC2 Seed ─────────────────────────────────────────────────────────────
  console.log("Seeding UC2 image fixtures...");

  await prisma.documentImage.upsert({
    where: { id: "default-image-id" },
    update: { hasAltText: false, complexityFlag: false },
    create: {
      id: "default-image-id",
      documentId: defaultDoc.id,
      filename: "patient-intake-flowchart.png",
      complexityFlag: false,
      hasAltText: false,
    },
  });

  await prisma.documentImage.upsert({
    where: { id: "complex-image-id" },
    update: { hasAltText: false, complexityFlag: true },
    create: {
      id: "complex-image-id",
      documentId: defaultDoc.id,
      filename: "complex-medical-chart.png",
      complexityFlag: true,
      hasAltText: false,
    },
  });

  await prisma.documentImage.upsert({
    where: { id: "approved-image-id" },
    update: { hasAltText: true, complexityFlag: false },
    create: {
      id: "approved-image-id",
      documentId: defaultDoc.id,
      filename: "hospital-logo.png",
      complexityFlag: false,
      hasAltText: true,
    },
  });

  await prisma.imageAltText.upsert({
    where: { id: "approved-alt-text-id" },
    update: {},
    create: {
      id: "approved-alt-text-id",
      imageId: "approved-image-id",
      altText: "Hospital logo showing a blue cross and the organization name.",
      wcagCompliant: true,
      approved: true,
      status: "success",
    },
  });

  console.log(
    "  DocumentImages: default-image-id, complex-image-id, approved-image-id"
  );
  console.log("  ImageAltText: approved-alt-text-id (pre-approved)");

  // ── UC3 Seed ─────────────────────────────────────────────────────────────
  console.log("Seeding UC3 data...");

  // 5 Guideline records — WCAG 2.2 AA rules (from GUIDELINE_RULE_IDS)
  const guidelineDescriptions: Record<string, string> = {
    "1.1.1": "Non-text Content",
    "1.3.1": "Info and Relationships",
    "1.4.3": "Contrast (Minimum)",
    "2.1.1": "Keyboard",
    "4.1.2": "Name, Role, Value",
  };

  for (const ruleId of GUIDELINE_RULE_IDS) {
    await prisma.guideline.upsert({
      where: { ruleId },
      update: {},
      create: {
        ruleId,
        description: guidelineDescriptions[ruleId] ?? ruleId,
        version: "WCAG 2.2 AA",
      },
    });
  }

  console.log(`  Guidelines: ${GUIDELINE_RULE_IDS.join(", ")}`);

  // 3 Document fixtures for UC3 audit scenarios
  await prisma.document.upsert({
    where: { id: "violations-document-id" },
    update: {},
    create: {
      id: "violations-document-id",
      sessionId: session.id,
      sourceText:
        "A document with known accessibility issues: missing alt text, poor contrast, and non-keyboard-accessible elements.",
    },
  });

  await prisma.document.upsert({
    where: { id: "clean-document-id" },
    update: {},
    create: {
      id: "clean-document-id",
      sessionId: session.id,
      sourceText:
        "A fully accessible document with proper headings, alt text, and sufficient colour contrast.",
    },
  });

  await prisma.document.upsert({
    where: { id: "all-severity-document-id" },
    update: {},
    create: {
      id: "all-severity-document-id",
      sessionId: session.id,
      sourceText:
        "A document with Critical, Serious, and Minor accessibility violations for severity categorisation testing.",
    },
  });

  console.log(
    "  Audit Documents: violations-document-id, clean-document-id, all-severity-document-id"
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
