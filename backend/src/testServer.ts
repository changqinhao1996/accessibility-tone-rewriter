import "dotenv/config";
import { createApp } from "./app.js";
import { StyleRewriterDouble } from "./control/StyleRewriterDouble.js";
import prisma from "./entity/prismaClient.js";

/**
 * Test server entry point for acceptance testing.
 *
 * Injects the deterministic StyleRewriterDouble so all
 * Gherkin scenarios run against predictable behavior.
 */
const PORT = process.env["PORT"] ?? 3001;

const app = createApp(new StyleRewriterDouble(), prisma);

app.listen(PORT, () => {
  console.log(
    `[testServer] Backend (test mode) running on http://localhost:${String(PORT)}`
  );
});
