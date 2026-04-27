import { Router } from "express";
import type { Request, Response } from "express";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { GenerateAltTextService } from "../control/GenerateAltTextService.js";
import type { IAccessibilityChecker } from "../control/IAccessibilityChecker.js";

/**
 * Creates the Express router for the Alt Text API boundary (UC2).
 *
 * Routes:
 * - GET  /api/images               → List images for the active document
 * - POST /api/alt-text/generate    → Generate Alt Text for a selected image
 * - POST /api/alt-text/approve     → Approve and attach a pending Alt Text
 */
export function createAltTextRouter(
  accessibilityChecker: IAccessibilityChecker,
  prisma: PrismaClient
): Router {
  const router = Router();
  const service = new GenerateAltTextService(accessibilityChecker, prisma);

  /**
   * GET /api/images
   * Returns all DocumentImage records for the active document.
   * The frontend uses hasAltText to decide which images are eligible.
   */
  router.get("/api/images", async (_req: Request, res: Response) => {
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
        orderBy: { createdAt: "asc" },
      });

      if (!document) {
        res.status(404).json({ error: "No document found" });
        return;
      }

      const images = await prisma.documentImage.findMany({
        where: { documentId: document.id },
        orderBy: { createdAt: "asc" },
      });

      res.status(200).json(
        images.map((img) => ({
          id: img.id,
          filename: img.filename,
          hasAltText: img.hasAltText,
          complexityFlag: img.complexityFlag,
        }))
      );
    } catch (error) {
      console.error("Images fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/alt-text/generate
   * Body: { imageId, context? }
   */
  router.post("/api/alt-text/generate", async (req: Request, res: Response) => {
    try {
      const { imageId, context } = req.body as {
        imageId: string;
        context?: string;
      };

      const result = await service.generate(imageId, context);

      if (result.status === "validation_error") {
        res.status(400).json(result);
        return;
      }

      if (result.status === "complex") {
        res.status(422).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Alt text generation error:", error);
      res.status(500).json({ status: "error", error: "Internal server error" });
    }
  });

  /**
   * POST /api/alt-text/approve
   * Body: { imageAltTextId }
   */
  router.post("/api/alt-text/approve", async (req: Request, res: Response) => {
    try {
      const { imageAltTextId } = req.body as { imageAltTextId: string };

      const result = await service.approve(imageAltTextId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Alt text approval error:", error);
      res.status(400).json({ error: String(error) });
    }
  });

  return router;
}
