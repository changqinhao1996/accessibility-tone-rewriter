import { Router } from "express";
import type { Request, Response } from "express";
import type { IAuditChecker } from "../control/IAuditChecker.js";
import { AuditDocumentService } from "../control/AuditDocumentService.js";
import type { PrismaClient } from "../../generated/prisma/client.js";

/**
 * Boundary controller for UC3: AuditDocumentForAccessibility.
 *
 * Routes:
 *   POST /api/audit                       — trigger audit for a document
 *   GET  /api/audit/:documentId/latest    — retrieve the latest audit report
 */
export function createAuditRouter(
  auditChecker: IAuditChecker,
  prisma: PrismaClient
): Router {
  const router = Router();
  const service = new AuditDocumentService(auditChecker, prisma);

  /**
   * POST /api/audit
   * Body: { documentId: string }
   */
  router.post("/api/audit", async (req: Request, res: Response) => {
    const { documentId } = req.body as { documentId?: string };

    if (!documentId || typeof documentId !== "string") {
      res.status(400).json({
        status: "validation_error",
        error: "documentId is required.",
      });
      return;
    }

    const result = await service.execute(documentId);

    if (result.status === "validation_error") {
      res.status(400).json(result);
      return;
    }

    if (result.status === "error") {
      res.status(500).json(result);
      return;
    }

    res.status(200).json(result);
  });

  /**
   * GET /api/audit/:documentId/latest
   * Returns the most recent AuditReport with its violations.
   */
  router.get(
    "/api/audit/:documentId/latest",
    async (req: Request, res: Response) => {
      const { documentId } = req.params;

      const report = await prisma.auditReport.findFirst({
        where: { documentId },
        orderBy: { createdAt: "desc" },
        include: { violations: true },
      });

      if (!report) {
        res.status(404).json({ error: "No audit report found for document." });
        return;
      }

      res.status(200).json(report);
    }
  );

  return router;
}
