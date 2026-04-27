import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setDocumentToAmbiguous, setDocumentToEmpty } from '../testsupport/dbReset';
import { verifyBackendHealth } from '../testsupport/seedData';

// ============================================================
// Type augmentation for Cucumber world
// ============================================================
interface CustomWorld {
  page: Page;
  frontendUrl: string;
  backendUrl: string;
  rewriteLatencyMs?: number;
}

// ============================================================
// BACKGROUND STEPS
// ============================================================

Given('the ContentDesigner is logged in', async function (this: CustomWorld) {
  // Navigate to the frontend — session is pre-seeded
  await this.page.goto(this.frontendUrl);
  await this.page.waitForLoadState('networkidle');
});

Given('a document containing source text is loaded', async function (this: CustomWorld) {
  // Wait for the source text textarea to be populated
  const sourceText = this.page.locator('#source-text');
  await expect(sourceText).not.toBeEmpty({ timeout: 5000 });
});

Given('the StyleRewriter service is operational', async function (this: CustomWorld) {
  const isHealthy = await verifyBackendHealth();
  expect(isHealthy).toBe(true);
});

// ============================================================
// SCENARIO-SPECIFIC GIVEN STEPS
// ============================================================

Given('the loaded document contains highly ambiguous, unsafe text', async function (this: CustomWorld) {
  // Update the document in the DB to contain ambiguous text
  await setDocumentToAmbiguous();
  // Reload the page so the frontend fetches the updated document
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

Given('the loaded document is empty', async function (this: CustomWorld) {
  // Update the document in the DB to be empty
  await setDocumentToEmpty();
  // Reload the page so the frontend fetches the updated document
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

// ============================================================
// WHEN STEPS
// ============================================================

When(
  'the ContentDesigner selects the audience profile {string}',
  async function (this: CustomWorld, profile: string) {
    await this.page.selectOption('#audience-profile', profile);
  }
);

When(
  'the ContentDesigner specifies a target reading grade level of {string}',
  async function (this: CustomWorld, grade: string) {
    await this.page.fill('#target-grade', grade);
  }
);

When('the ContentDesigner submits the rewrite request', async function (this: CustomWorld) {
  // Intercept the API response to capture latency
  const responsePromise = this.page.waitForResponse(
    (response) => response.url().includes('/api/rewrite'),
    { timeout: 10000 }
  );

  await this.page.click('#submit-rewrite');

  // Wait for the API response
  const response = await responsePromise;
  const body = await response.json();

  // Store latency for later assertions
  if (body.latencyMs !== undefined) {
    this.rewriteLatencyMs = body.latencyMs;
  }

  // Give the UI a moment to render the results
  await this.page.waitForTimeout(500);
});

// ============================================================
// THEN STEPS — Happy Path (UC1-S01)
// ============================================================

Then(
  'a rewritten draft is generated preserving the original semantic intent',
  async function (this: CustomWorld) {
    // Assert the rewritten draft panel is visible and has content
    const draftPanel = this.page.locator('#rewritten-draft-panel');
    await expect(draftPanel).toBeVisible({ timeout: 5000 });

    const content = draftPanel.locator('.panel-content');
    await expect(content).not.toBeEmpty();
  }
);

Then(
  'the system presents the rewritten draft alongside the original text',
  async function (this: CustomWorld) {
    // Both panels must be visible simultaneously
    const originalPanel = this.page.locator('#original-text-panel');
    const draftPanel = this.page.locator('#rewritten-draft-panel');

    await expect(originalPanel).toBeVisible({ timeout: 5000 });
    await expect(draftPanel).toBeVisible({ timeout: 5000 });

    // Both must have content
    const originalContent = originalPanel.locator('.panel-content');
    const draftContent = draftPanel.locator('.panel-content');

    await expect(originalContent).not.toBeEmpty();
    await expect(draftContent).not.toBeEmpty();
  }
);

Then(
  'the calculated reading level of the draft is within {int} grade of {string}',
  async function (this: CustomWorld, tolerance: number, targetGrade: string) {
    const target = parseInt(targetGrade, 10);

    // Read the grade from the reading level indicator
    const indicator = this.page.locator('#reading-level-indicator');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const gradeAttr = await indicator.getAttribute('data-grade');
    expect(gradeAttr).not.toBeNull();

    const calculatedGrade = parseFloat(gradeAttr!);
    const diff = Math.abs(calculatedGrade - target);

    expect(diff).toBeLessThanOrEqual(tolerance);
  }
);

// ============================================================
// THEN STEPS — Performance (UC1-S02)
// ============================================================

Then(
  'the rewritten draft must be generated in under {int} milliseconds',
  async function (this: CustomWorld, maxMs: number) {
    expect(this.rewriteLatencyMs).toBeDefined();
    expect(this.rewriteLatencyMs!).toBeLessThan(maxMs);
  }
);

// ============================================================
// THEN STEPS — Ambiguity Error (UC1-S03)
// ============================================================

Then('no rewritten draft is generated', async function (this: CustomWorld) {
  // The rewritten draft panel should not be visible
  const draftPanel = this.page.locator('#rewritten-draft-panel');
  await expect(draftPanel).not.toBeVisible({ timeout: 3000 });
});

Then(
  'the system displays an error indicating the text is too ambiguous to rewrite safely',
  async function (this: CustomWorld) {
    const errorEl = this.page.locator('#error-ambiguous');
    await expect(errorEl).toBeVisible({ timeout: 5000 });

    const text = await errorEl.textContent();
    expect(text?.toLowerCase()).toContain('too ambiguous');
  }
);

// ============================================================
// THEN STEPS — Validation Error (UC1-S04)
// ============================================================

Then(
  'the system displays a validation error regarding the missing source text',
  async function (this: CustomWorld) {
    const errorEl = this.page.locator('#error-validation');
    await expect(errorEl).toBeVisible({ timeout: 5000 });

    const text = await errorEl.textContent();
    expect(text?.toLowerCase()).toContain('source text');
  }
);
