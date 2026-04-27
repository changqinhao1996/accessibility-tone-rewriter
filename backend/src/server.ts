import "dotenv/config";
import { createApp } from "./app.js";
import { StyleRewriterDouble } from "./control/StyleRewriterDouble.js";
import prisma from "./entity/prismaClient.js";

/**
 * Production server entry point.
 *
 * Currently uses StyleRewriterDouble as a placeholder.
 * Replace with a real AI-backed adapter when available.
 */
const PORT = process.env["PORT"] ?? 3001;

const app = createApp(new StyleRewriterDouble(), prisma);

app.listen(PORT, () => {
  console.log(`[server] Backend running on http://localhost:${String(PORT)}`);
});
