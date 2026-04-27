import express from "express";
import cors from "cors";
import type { IStyleRewriter } from "./control/IStyleRewriter.js";
import type { IAccessibilityChecker } from "./control/IAccessibilityChecker.js";
import type { IAuditChecker } from "./control/IAuditChecker.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createRewriteRouter } from "./boundary/rewriteController.js";
import { createAltTextRouter } from "./boundary/altTextController.js";
import { createAuditRouter } from "./boundary/auditController.js";

/**
 * Express application factory.
 *
 * Accepts service dependencies via parameters — constructor-style DI:
 * - Production: injects real AI-backed adapters
 * - Acceptance tests: injects deterministic test doubles
 *
 * @param styleRewriter        — UC1: IStyleRewriter implementation
 * @param accessibilityChecker — UC2: IAccessibilityChecker implementation
 * @param auditChecker         — UC3: IAuditChecker implementation
 * @param prisma               — Prisma client instance
 */
export function createApp(
  styleRewriter: IStyleRewriter,
  accessibilityChecker: IAccessibilityChecker,
  auditChecker: IAuditChecker,
  prisma: PrismaClient
): express.Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Routes — UC1
  const rewriteRouter = createRewriteRouter(styleRewriter, prisma);
  app.use(rewriteRouter);

  // Routes — UC2
  const altTextRouter = createAltTextRouter(accessibilityChecker, prisma);
  app.use(altTextRouter);

  // Routes — UC3
  const auditRouter = createAuditRouter(auditChecker, prisma);
  app.use(auditRouter);

  return app;
}
