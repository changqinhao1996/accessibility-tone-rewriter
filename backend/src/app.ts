import express from "express";
import cors from "cors";
import type { IStyleRewriter } from "./control/IStyleRewriter.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createRewriteRouter } from "./boundary/rewriteController.js";

/**
 * Express application factory.
 *
 * Accepts an IStyleRewriter implementation via parameter,
 * enabling constructor-style DI at the application level:
 * - Production: injects a real AI-backed adapter
 * - Acceptance tests: injects StyleRewriterDouble
 */
export function createApp(
  styleRewriter: IStyleRewriter,
  prisma: PrismaClient
): express.Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  const rewriteRouter = createRewriteRouter(styleRewriter, prisma);
  app.use(rewriteRouter);

  return app;
}
