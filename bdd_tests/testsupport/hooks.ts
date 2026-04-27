import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { resetRewriteRequests, resetDocumentToDefault } from './dbReset';

// Shared Playwright instances
let browser: Browser;
let context: BrowserContext;
let page: Page;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * BeforeAll: Launch browser and verify services are running.
 */
BeforeAll(async function () {
  browser = await chromium.launch({ headless: true });

  // Verify backend is running
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    if (!res.ok) throw new Error(`Backend health check failed: ${res.status}`);
  } catch (err) {
    throw new Error(
      `Backend is not running at ${BACKEND_URL}. Start with: cd backend && npm run start:test\n${err}`
    );
  }
});

/**
 * Before each scenario:
 * - Reset DB state (clear RewriteRequests, reset Document)
 * - Open fresh browser context and page
 */
Before(async function () {
  await resetRewriteRequests();
  await resetDocumentToDefault();

  context = await browser.newContext();
  page = await context.newPage();

  // Store page in world for step definitions
  this.page = page;
  this.frontendUrl = FRONTEND_URL;
  this.backendUrl = BACKEND_URL;
});

/**
 * After each scenario:
 * - Capture screenshot on failure
 * - Close browser context
 */
After(async function (scenario) {
  if (scenario.result?.status === 'FAILED' && page) {
    const screenshot = await page.screenshot();
    this.attach(screenshot, 'image/png');
  }

  if (context) {
    await context.close();
  }
});

/**
 * AfterAll: Close browser.
 */
AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
});
