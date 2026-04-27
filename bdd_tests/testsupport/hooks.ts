import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import {
  resetRewriteRequests,
  resetDocumentToDefault,
  resetImageAltTexts,
  resetDocumentImages,
  seedApprovedAltText,
  resetAuditViolations,
  resetAuditReports,
} from './dbReset';
import { verifyBackendHealth } from './seedData';

let browser: Browser;
let context: BrowserContext;
let page: Page;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3001';

/**
 * BeforeAll: Launch browser and verify services are running.
 */
BeforeAll(async function () {
  browser = await chromium.launch({ headless: true });

  const healthy = await verifyBackendHealth();
  if (!healthy) {
    throw new Error(
      `Backend is not running at ${BACKEND_URL}. Start with: cd backend && npm run start:test`
    );
  }
});

/**
 * Before each @uc1 scenario.
 */
Before({ tags: '@uc1' }, async function () {
  await resetRewriteRequests();
  await resetDocumentToDefault();

  context = await browser.newContext();
  page    = await context.newPage();

  this.page        = page;
  this.frontendUrl = FRONTEND_URL;
  this.backendUrl  = BACKEND_URL;
});

/**
 * Before each @uc2 scenario.
 */
Before({ tags: '@uc2' }, async function () {
  await resetImageAltTexts();
  await resetDocumentImages();
  await seedApprovedAltText();

  context = await browser.newContext();
  page    = await context.newPage();

  this.page        = page;
  this.frontendUrl = FRONTEND_URL;
  this.backendUrl  = BACKEND_URL;
});

/**
 * Before each @uc3 scenario.
 * Clears AuditViolation first (FK), then AuditReport.
 */
Before({ tags: '@uc3' }, async function () {
  await resetAuditViolations();
  await resetAuditReports();

  context = await browser.newContext();
  page    = await context.newPage();

  this.page        = page;
  this.frontendUrl = FRONTEND_URL;
  this.backendUrl  = BACKEND_URL;
});

/**
 * After each scenario — capture screenshot on failure, close context.
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
