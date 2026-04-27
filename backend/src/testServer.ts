import "dotenv/config";
import { createApp } from "./app.js";
import { StyleRewriterDouble } from "./control/StyleRewriterDouble.js";
import { AccessibilityCheckerDouble } from "./control/AccessibilityCheckerDouble.js";
import { AuditCheckerDouble } from "./control/AuditCheckerDouble.js";
import prisma from "./entity/prismaClient.js";

/**
 * Test server entry point for acceptance testing.
 *
 * Injects deterministic doubles so all Gherkin scenarios
 * (UC1 + UC2 + UC3) run against predictable, controlled behavior.
 */
const PORT = process.env["PORT"] ?? 3001;

const app = createApp(
  new StyleRewriterDouble(),
  new AccessibilityCheckerDouble(),
  new AuditCheckerDouble(),
  prisma
);

app.listen(PORT, () => {
  console.log(
    `[testServer] Backend (test mode) running on http://localhost:${String(PORT)}`
  );
});
