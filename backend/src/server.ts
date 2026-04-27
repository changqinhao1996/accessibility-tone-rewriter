import "dotenv/config";
import { createApp } from "./app.js";
import { StyleRewriterDouble } from "./control/StyleRewriterDouble.js";
import { AccessibilityCheckerDouble } from "./control/AccessibilityCheckerDouble.js";
import { AuditCheckerDouble } from "./control/AuditCheckerDouble.js";
import prisma from "./entity/prismaClient.js";

/**
 * Production server entry point.
 *
 * Currently uses test doubles as placeholders for all three services.
 * Replace with real AI-backed adapters when available.
 */
const PORT = process.env["PORT"] ?? 3001;

const app = createApp(
  new StyleRewriterDouble(),
  new AccessibilityCheckerDouble(),
  new AuditCheckerDouble(),
  prisma
);

app.listen(PORT, () => {
  console.log(`[server] Backend running on http://localhost:${String(PORT)}`);
});
