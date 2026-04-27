import type { PrismaClient } from "../../generated/prisma/client.js";
import type { IAuditChecker } from "./IAuditChecker.js";

const VALID_SEVERITIES = new Set(["Critical", "Serious", "Minor"]);
const GUIDELINES_VERSION = "WCAG 2.2 AA";

/**
 * Response shape for AuditDocumentService.execute()
 */
export interface AuditDocumentResult {
  auditReportId: string | null;
  documentId: string;
  guidelinesVersion: string;
  violations: Array<{
    ruleId: string;
    severity: string;
    description: string;
  }>;
  status: "complete" | "validation_error" | "error";
  error?: string;
}

/**
 * Application service for UC3: AuditDocumentForAccessibility.
 *
 * Orchestrates the full audit workflow:
 * 1. Validates document existence
 * 2. Retrieves WCAG 2.2 AA Guideline rules from DB (Step 2 of main flow)
 * 3. Delegates scanning to IAuditChecker (Step 3)
 * 4. Validates severity values (A2)
 * 5. Persists AuditReport + AuditViolation[] atomically (failure postcondition)
 * 6. Returns structured result
 */
export class AuditDocumentService {
  private readonly auditChecker: IAuditChecker;
  private readonly prisma: PrismaClient;

  constructor(auditChecker: IAuditChecker, prisma: PrismaClient) {
    this.auditChecker = auditChecker;
    this.prisma = prisma;
  }

  /**
   * Execute the accessibility audit for the given document.
   *
   * @param documentId - ID of the Document to audit
   */
  async execute(documentId: string): Promise<AuditDocumentResult> {
    // 1. Validate document exists
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return {
        auditReportId: null,
        documentId,
        guidelinesVersion: GUIDELINES_VERSION,
        violations: [],
        status: "validation_error",
        error: "No valid document found for the provided ID.",
      };
    }

    // 2. Retrieve WCAG 2.2 AA guidelines from DB
    const guidelines = await this.prisma.guideline.findMany({
      where: { version: GUIDELINES_VERSION },
      orderBy: { ruleId: "asc" },
    });

    const ruleIds = guidelines.map((g) => g.ruleId);

    // 3. Delegate to AccessibilityChecker
    let rawViolations: Awaited<ReturnType<IAuditChecker["audit"]>>;
    try {
      rawViolations = await this.auditChecker.audit(documentId, ruleIds);
    } catch (err) {
      // Failure postcondition: no partial report stored on checker error
      return {
        auditReportId: null,
        documentId,
        guidelinesVersion: GUIDELINES_VERSION,
        violations: [],
        status: "error",
        error: "AccessibilityChecker failed to complete analysis.",
      };
    }

    // 4. Validate severity values (A2: exactly Critical | Serious | Minor)
    for (const v of rawViolations) {
      if (!VALID_SEVERITIES.has(v.severity)) {
        return {
          auditReportId: null,
          documentId,
          guidelinesVersion: GUIDELINES_VERSION,
          violations: [],
          status: "error",
          error: `Invalid severity value "${v.severity}" returned by AccessibilityChecker.`,
        };
      }
    }

    // 5. Persist atomically — AuditReport + AuditViolation[] in one transaction
    const auditReport = await this.prisma.$transaction(async (tx) => {
      const report = await tx.auditReport.create({
        data: {
          documentId,
          guidelinesVersion: GUIDELINES_VERSION,
          status: "complete",
        },
      });

      if (rawViolations.length > 0) {
        await tx.auditViolation.createMany({
          data: rawViolations.map((v) => ({
            auditReportId: report.id,
            ruleId: v.ruleId,
            severity: v.severity,
            description: v.description,
          })),
        });
      }

      return report;
    });

    return {
      auditReportId: auditReport.id,
      documentId,
      guidelinesVersion: GUIDELINES_VERSION,
      violations: rawViolations,
      status: "complete",
    };
  }
}
