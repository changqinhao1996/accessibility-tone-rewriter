import { Router } from "express";
import type { Request, Response } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { RewriteContentService } from "../control/RewriteContentService.js";
import type { IStyleRewriter } from "../control/IStyleRewriter.js";

/**
 * Creates the Express router for the rewrite API boundary.
 *
 * Routes:
 * - POST /api/rewrite        → Execute the rewrite use case
 * - GET  /api/document/default → Load the default document for the session
 * - GET  /api/health          → Health check for the StyleRewriter service
 */
export function createRewriteRouter(
  styleRewriter: IStyleRewriter,
  prisma: PrismaClient
): Router {
  const router = Router();
  const service = new RewriteContentService(styleRewriter, prisma);

  /**
   * POST /api/rewrite
   * Body: { documentId, audienceProfile, targetGradeLevel }
   */
  router.post("/api/rewrite", async (req: Request, res: Response) => {
    try {
      const { documentId, audienceProfile, targetGradeLevel } = req.body as {
        documentId: string;
        audienceProfile: string;
        targetGradeLevel: number;
      };

      const result = await service.execute(
        documentId,
        audienceProfile,
        targetGradeLevel
      );

      if (result.status === "validation_error") {
        res.status(400).json(result);
        return;
      }

      if (result.status === "ambiguous") {
        res.status(422).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Rewrite error:", error);
      res.status(500).json({
        status: "error",
        error: "Internal server error",
      });
    }
  });

  /**
   * GET /api/document/default
   * Returns the most recent document for the active session.
   */
  router.get("/api/document/default", async (_req: Request, res: Response) => {
    try {
      const session = await prisma.session.findFirst({
        where: { active: true },
        orderBy: { createdAt: "desc" },
      });

      if (!session) {
        res.status(404).json({ error: "No active session found" });
        return;
      }

      const document = await prisma.document.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
      });

      if (!document) {
        res.status(404).json({ error: "No document found" });
        return;
      }

      res.status(200).json({
        id: document.id,
        sourceText: document.sourceText,
      });
    } catch (error) {
      console.error("Document fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/health
   * Health check confirming the StyleRewriter service is operational.
   */
  router.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "StyleRewriter" });
  });

  return router;
}
