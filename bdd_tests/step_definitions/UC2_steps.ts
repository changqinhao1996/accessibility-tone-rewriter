import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  setAllImagesApproved,
  getApprovedAltText,
  countImageAltTexts,
} from '../testsupport/dbReset';
import { verifyBackendHealth, FIXTURES } from '../testsupport/seedData';

/**
 * Inline WCAG Alt Text check for UC2-S06 oracle.
 * Mirrors the logic in backend/src/control/wcagAltTextCheck.ts.
 */
function wcagAltTextCheck(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.length > 250) return false;
  const lower = text.trim().toLowerCase();
  const prohibited = ['image of', 'picture of', 'photo of'];
  for (const phrase of prohibited) {
    if (lower === phrase) return false;
    if (lower.startsWith(phrase + ' ') || lower.startsWith(phrase + ',')) return false;
  }
  return true;
}



// ============================================================
// Type augmentation for Cucumber world
// ============================================================
interface CustomWorld {
  page: Page;
  frontendUrl: string;
  backendUrl: string;
}

const ALT_TEXT_PAGE = '/alt-text';

// ============================================================
// BACKGROUND STEPS
// ============================================================

// NOTE: 'the ContentDesigner is logged in' is defined in UC1_steps.ts
// and is shared across both feature files via Cucumber's step registry.
// UC2 re-uses that step; navigation to /alt-text happens in the next step.

Given('the document contains an image without Alt Text', async function (this: CustomWorld) {
  // Navigate to the UC2 page
  await this.page.goto(`${this.frontendUrl}${ALT_TEXT_PAGE}`);
  await this.page.waitForLoadState('networkidle');

  // Wait for the image select to have at least one eligible option
  const imageSelect = this.page.locator('#image-select');
  await expect(imageSelect).toBeVisible({ timeout: 5000 });
  await expect(imageSelect.locator(`option[value="${FIXTURES.defaultImageId}"]`)).toHaveCount(1, { timeout: 5000 });
});


Given('the AccessibilityChecker service is operational', async function (this: CustomWorld) {
  const isHealthy = await verifyBackendHealth();
  expect(isHealthy).toBe(true);
});

// ============================================================
// SCENARIO-SPECIFIC GIVEN STEPS
// ============================================================

Given('the document contains a highly complex image that cannot be auto-described', async function (this: CustomWorld) {
  // Navigate to the alt-text page — complex-image-id is always seeded with complexityFlag: true
  await this.page.goto(`${this.frontendUrl}${ALT_TEXT_PAGE}`);
  await this.page.waitForLoadState('networkidle');
});


Given('all images in the document already have approved Alt Text', async function (this: CustomWorld) {
  // Set all DocumentImage.hasAltText = true
  await setAllImagesApproved();
  // Reload page so the frontend fetches the updated image list
  await this.page.goto(`${this.frontendUrl}${ALT_TEXT_PAGE}`);
  await this.page.waitForLoadState('networkidle');
});

// ============================================================
// WHEN STEPS
// ============================================================

When('the ContentDesigner selects the image without Alt Text', async function (this: CustomWorld) {
  await this.page.selectOption('#image-select', FIXTURES.defaultImageId);
});

When('the ContentDesigner selects the complex image', async function (this: CustomWorld) {
  await this.page.selectOption('#image-select', FIXTURES.complexImageId);
});

When(
  'the ContentDesigner provides the context {string}',
  async function (this: CustomWorld, context: string) {
    await this.page.fill('#context-input', context);
  }
);

When('the ContentDesigner submits the Alt Text generation request', async function (this: CustomWorld) {
  const responsePromise = this.page.waitForResponse(
    (resp) => resp.url().includes('/api/alt-text/generate'),
    { timeout: 10000 }
  );
  await this.page.click('#submit-alt-text');
  await responsePromise;
  await this.page.waitForTimeout(300);
});

When('the ContentDesigner submits the Alt Text generation request without providing context', async function (this: CustomWorld) {
  const responsePromise = this.page.waitForResponse(
    (resp) => resp.url().includes('/api/alt-text/generate'),
    { timeout: 10000 }
  ).catch(() => null); // S05 sends no request; don't throw

  await this.page.click('#submit-alt-text');

  // Wait briefly regardless — the response may not arrive for S05
  await Promise.race([responsePromise, this.page.waitForTimeout(1500)]);
  await this.page.waitForTimeout(300);
});

When('the ContentDesigner approves the Alt Text', async function (this: CustomWorld) {
  const approveBtn = this.page.locator('#approve-alt-text');
  await expect(approveBtn).toBeVisible({ timeout: 5000 });

  const responsePromise = this.page.waitForResponse(
    (resp) => resp.url().includes('/api/alt-text/approve'),
    { timeout: 10000 }
  );
  await approveBtn.click();
  await responsePromise;
  await this.page.waitForTimeout(300);
});

When('the ContentDesigner attempts to submit an Alt Text generation request', async function (this: CustomWorld) {
  // The select may be empty/disabled; clicking submit shows the error client-side
  await this.page.click('#submit-alt-text');
  await this.page.waitForTimeout(300);
});

// ============================================================
// THEN STEPS — Happy Path
// ============================================================

Then('a descriptive Alt Text is generated for the image', async function (this: CustomWorld) {
  const preview = this.page.locator('#alt-text-preview');
  await expect(preview).toBeVisible({ timeout: 5000 });
  const text = await preview.textContent();
  expect(text?.trim().length).toBeGreaterThan(0);
});

Then('the system displays the generated Alt Text for review', async function (this: CustomWorld) {
  const preview = this.page.locator('#alt-text-preview');
  await expect(preview).toBeVisible({ timeout: 5000 });

  // Approve button must be visible (A4 — approval is explicit)
  const approveBtn = this.page.locator('#approve-alt-text');
  await expect(approveBtn).toBeVisible({ timeout: 5000 });
});

Then('the Alt Text is attached to the image metadata', async function (this: CustomWorld) {
  const confirmation = this.page.locator('#alt-text-attached-confirmation');
  await expect(confirmation).toBeVisible({ timeout: 5000 });
});

// ============================================================
// THEN STEPS — Persistence (UC2-S03)
// ============================================================

Then('the image record in the database has an approved Alt Text attached', async function (this: CustomWorld) {
  const row = await getApprovedAltText(FIXTURES.defaultImageId);
  expect(row).not.toBeNull();
  expect(row!.approved).toBe(true);
  expect(row!.altText.trim().length).toBeGreaterThan(0);
});

// ============================================================
// THEN STEPS — Failure Scenarios
// ============================================================

Then('no Alt Text is generated', async function (this: CustomWorld) {
  // Approve button must NOT be visible
  const approveBtn = this.page.locator('#approve-alt-text');
  await expect(approveBtn).not.toBeVisible({ timeout: 3000 });
});

Then('the system displays an error indicating the image requires manual description', async function (this: CustomWorld) {
  const errorEl = this.page.locator('#error-complex-image');
  await expect(errorEl).toBeVisible({ timeout: 5000 });

  const text = await errorEl.textContent();
  expect(text?.toLowerCase()).toContain('manual description');
});

Then('the system displays an error indicating no eligible image is available', async function (this: CustomWorld) {
  const errorEl = this.page.locator('#error-no-eligible-image');
  await expect(errorEl).toBeVisible({ timeout: 5000 });
});

Then('no Alt Text generation request is sent to the AccessibilityChecker', async function (this: CustomWorld) {
  // No ImageAltText rows should exist for any image (all were cleared in Before hook)
  const count = await countImageAltTexts();
  // approved-alt-text-id was re-seeded in Before hook for approved-image-id only
  // So default-image-id and complex-image-id should have 0 records
  const countForDefault = await countImageAltTexts(FIXTURES.defaultImageId);
  const countForComplex = await countImageAltTexts(FIXTURES.complexImageId);
  expect(countForDefault).toBe(0);
  expect(countForComplex).toBe(0);
});

// ============================================================
// THEN STEPS — Quality / NFR (UC2-S06)
// ============================================================

Then('the generated Alt Text complies with WCAG accessibility standards', async function (this: CustomWorld) {
  const preview = this.page.locator('#alt-text-preview');
  await expect(preview).toBeVisible({ timeout: 5000 });

  const text = (await preview.textContent()) ?? '';
  expect(wcagAltTextCheck(text.trim())).toBe(true);
});

Then('the generated Alt Text does not describe elements absent from the image', async function (this: CustomWorld) {
  const preview = this.page.locator('#alt-text-preview');
  const text = ((await preview.textContent()) ?? '').toLowerCase();

  for (const absent of FIXTURES.absentElements) {
    expect(text).not.toContain(absent.toLowerCase());
  }
});
