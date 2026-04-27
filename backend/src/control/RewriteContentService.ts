import type { PrismaClient } from "../../generated/prisma/client.js";
import type { IStyleRewriter } from "./IStyleRewriter.js";

/**
 * Response shape returned by RewriteContentService.execute().
 */
export interface RewriteResult {
  originalText: string;
  rewrittenText: string | null;
  calculatedGradeLevel: number | null;
  latencyMs: number | null;
  status: "success" | "ambiguous" | "validation_error";
  error?: string;
}

/**
 * Application service for UC1: RewriteContentForTargetAudience.
 *
 * Orchestrates the rewrite workflow:
 * 1. Validates input (non-empty source text)
 * 2. Loads audience profile and linguistic rules
 * 3. Delegates to StyleRewriter (injected via constructor)
 * 4. Captures timing metrics
 * 5. Handles ambiguity flags
 * 6. Persists RewriteRequest record
 *
 * The IStyleRewriter dependency is injected via constructor DI,
 * enabling test doubles during acceptance testing.
 */
export class RewriteContentService {
  private readonly styleRewriter: IStyleRewriter;
  private readonly prisma: PrismaClient;

  constructor(styleRewriter: IStyleRewriter, prisma: PrismaClient) {
    this.styleRewriter = styleRewriter;
    this.prisma = prisma;
  }

  /**
   * Execute the rewrite use case.
   *
   * @param documentId - ID of the loaded document
   * @param audienceProfileName - Name of the target audience (e.g., "Pediatric")
   * @param targetGradeLevel - Desired reading grade level
   */
  async execute(
    documentId: string,
    audienceProfileName: string,
    targetGradeLevel: number
  ): Promise<RewriteResult> {
    // 1. Load the document
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return {
        originalText: "",
        rewrittenText: null,
        calculatedGradeLevel: null,
        latencyMs: null,
        status: "validation_error",
        error: "Document not found",
      };
    }

    // 2. Validate source text is not empty (UC1-S04)
    if (!document.sourceText || document.sourceText.trim().length === 0) {
      return {
        originalText: "",
        rewrittenText: null,
        calculatedGradeLevel: null,
        latencyMs: null,
        status: "validation_error",
        error: "Source text is missing",
      };
    }

    // 3. Load audience profile
    const audienceProfile = await this.prisma.audienceProfile.findUnique({
      where: { name: audienceProfileName },
    });

    if (!audienceProfile) {
      return {
        originalText: document.sourceText,
        rewrittenText: null,
        calculatedGradeLevel: null,
        latencyMs: null,
        status: "validation_error",
        error: `Audience profile "${audienceProfileName}" not found`,
      };
    }

    // 4. Call StyleRewriter with timing capture (UC1-S02)
    const startTime = performance.now();

    const result = await this.styleRewriter.rewrite(
      document.sourceText,
      audienceProfile.linguisticRules,
      targetGradeLevel
    );

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    // 5. Handle ambiguity flag (UC1-S03)
    if (result.ambiguityFlag) {
      await this.prisma.rewriteRequest.create({
        data: {
          documentId,
          audienceProfileId: audienceProfile.id,
          targetGradeLevel,
          rewrittenText: null,
          calculatedGradeLevel: null,
          ambiguityFlag: true,
          latencyMs,
          status: "ambiguous",
        },
      });

      return {
        originalText: document.sourceText,
        rewrittenText: null,
        calculatedGradeLevel: null,
        latencyMs,
        status: "ambiguous",
        error: "The text is too ambiguous to rewrite safely",
      };
    }

    // 6. Persist successful result (UC1-S01)
    await this.prisma.rewriteRequest.create({
      data: {
        documentId,
        audienceProfileId: audienceProfile.id,
        targetGradeLevel,
        rewrittenText: result.rewrittenText,
        calculatedGradeLevel: result.calculatedGradeLevel,
        ambiguityFlag: false,
        latencyMs,
        status: "success",
      },
    });

    // 7. Return assembled response
    return {
      originalText: document.sourceText,
      rewrittenText: result.rewrittenText,
      calculatedGradeLevel: result.calculatedGradeLevel,
      latencyMs,
      status: "success",
    };
  }
}
