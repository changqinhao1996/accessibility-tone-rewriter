import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  getLatestAuditReport,
  getAuditViolations,
  getDistinctAuditRuleIds,
  countAuditReports,
} from '../testsupport/dbReset';
import { verifyBackendHealth, FIXTURES, GUIDELINE_RULE_IDS } from '../testsupport/seedData';

// ============================================================
// Type augmentation for Cucumber world
// ============================================================
interface CustomWorld {
  page: Page;
  frontendUrl: string;
  backendUrl: string;
}

const AUDIT_VALID_SEVERITIES = new Set(['Critical', 'Serious', 'Minor']);

// ============================================================
// BACKGROUND STEPS
// ============================================================

// NOTE: The following Background steps are shared from other step files
// via Cucumber's global step registry:
//
//   'the AccessibilityChecker service is operational'
//       → defined in UC2_steps.ts; verifies backend health
//         (Cucumber shares step definitions globally)

Given('the AccessibilityLead is logged in', async function (this: CustomWorld) {
  // Navigate to root — session is pre-seeded.
  // Scenario-specific Given steps then navigate to /audit with the correct documentId.
  await this.page.goto(this.frontendUrl);
  await this.page.waitForLoadState('networkidle');
});

Given('a valid document is loaded in the session', async function (this: CustomWorld) {
  // Navigate to /audit with the standard violations document.
  // Each scenario-specific Given step will then re-navigate to its own documentId.
  await this.page.goto(
    `${this.frontendUrl}/audit?documentId=${FIXTURES.violationsDocumentId}`
  );
  await this.page.waitForLoadState('networkidle');
  await expect(this.page.locator('#run-audit')).toBeVisible({ timeout: 5000 });
});


// ============================================================
// SCENARIO-SPECIFIC GIVEN STEPS
// ============================================================

Given('the document contains known accessibility issues', async function (this: CustomWorld) {
  // Navigate to /audit with violations-document-id
  await this.page.goto(
    `${this.frontendUrl}/audit?documentId=${FIXTURES.violationsDocumentId}`
  );
  await this.page.waitForLoadState('networkidle');
});

Given('the document has no accessibility issues', async function (this: CustomWorld) {
  await this.page.goto(
    `${this.frontendUrl}/audit?documentId=${FIXTURES.cleanDocumentId}`
  );
  await this.page.waitForLoadState('networkidle');
});

Given(
  'the document contains Critical, Serious, and Minor accessibility issues',
  async function (this: CustomWorld) {
    await this.page.goto(
      `${this.frontendUrl}/audit?documentId=${FIXTURES.allSeverityDocumentId}`
    );
    await this.page.waitForLoadState('networkidle');
  }
);

Given('no valid document is loaded in the session', async function (this: CustomWorld) {
  // Use nonexistent-id to trigger validation_error without any DB setup
  await this.page.goto(
    `${this.frontendUrl}/audit?documentId=${FIXTURES.nonexistentDocumentId}`
  );
  await this.page.waitForLoadState('networkidle');
});

// ============================================================
// WHEN STEPS
// ============================================================

When(
  'the AccessibilityLead requests a full accessibility audit',
  async function (this: CustomWorld) {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/audit') && resp.request().method() === 'POST',
      { timeout: 10000 }
    );
    await this.page.click('#run-audit');
    await responsePromise;
    await this.page.waitForTimeout(300);
  }
);

When(
  'the AccessibilityLead attempts to request an accessibility audit',
  async function (this: CustomWorld) {
    // May not trigger a network request (error handled client-side or returns 400)
    const responsePromise = this.page
      .waitForResponse(
        (resp) => resp.url().includes('/api/audit') && resp.request().method() === 'POST',
        { timeout: 5000 }
      )
      .catch(() => null);

    await this.page.click('#run-audit');

    await Promise.race([responsePromise, this.page.waitForTimeout(2000)]);
    await this.page.waitForTimeout(300);
  }
);

// ============================================================
// THEN STEPS — System behaviour
// ============================================================

Then('the system retrieves WCAG 2.2 AA guidelines', async function (this: CustomWorld) {
  // The audit report container shows the guidelines version label after success
  // (asserted in the next steps — this step verifies the version string is present)
  const report = this.page.locator('#audit-report');
  await expect(report).toBeVisible({ timeout: 5000 });
  const text = (await report.textContent()) ?? '';
  expect(text).toContain('WCAG 2.2 AA');
});

Then(
  'the system scans the document and produces an Audit Report',
  async function (this: CustomWorld) {
    const report = this.page.locator('#audit-report');
    await expect(report).toBeVisible({ timeout: 5000 });
  }
);

// ============================================================
// THEN STEPS — Happy path (UC3-S01)
// ============================================================

Then(
  'the Audit Report is displayed with a list of violations',
  async function (this: CustomWorld) {
    const list = this.page.locator('#violation-list');
    await expect(list).toBeVisible({ timeout: 5000 });
    const count = await this.page.locator('#violation-list li').count();
    expect(count).toBeGreaterThan(0);
  }
);

Then(
  'each violation shows a severity level of Critical, Serious, or Minor',
  async function (this: CustomWorld) {
    const items = this.page.locator('#violation-list li');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const severity = await items.nth(i).getAttribute('data-severity');
      expect(AUDIT_VALID_SEVERITIES.has(severity ?? '')).toBe(true);
    }
  }
);

Then(
  'each violation shows a WCAG rule citation',
  async function (this: CustomWorld) {
    const items = this.page.locator('#violation-list li');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    const ruleIdPattern = /^\d+\.\d+(\.\d+)?$/;
    for (let i = 0; i < count; i++) {
      const ruleId = await items.nth(i).getAttribute('data-rule-id');
      expect(ruleId).not.toBeNull();
      expect(ruleIdPattern.test(ruleId ?? '')).toBe(true);
    }
  }
);

// ============================================================
// THEN STEPS — UC3-S02 (clean document)
// ============================================================

Then(
  'the Audit Report is displayed with no violations listed',
  async function (this: CustomWorld) {
    await expect(this.page.locator('#no-violations-message')).toBeVisible({ timeout: 5000 });
    const count = await this.page.locator('#violation-list li').count();
    expect(count).toBe(0);
  }
);

// ============================================================
// THEN STEPS — UC3-S03 (persistence)
// ============================================================

Then(
  'the Audit Report is persisted with status {string}',
  async function (this: CustomWorld, expectedStatus: string) {
    const report = await getLatestAuditReport(FIXTURES.violationsDocumentId);
    expect(report).not.toBeNull();
    expect(report!.status).toBe(expectedStatus);
    expect(report!.guidelinesVersion).toBe('WCAG 2.2 AA');
  }
);

Then(
  'the violations are persisted with their severity and rule citation',
  async function (this: CustomWorld) {
    const report = await getLatestAuditReport(FIXTURES.violationsDocumentId);
    expect(report).not.toBeNull();

    const violations = await getAuditViolations(report!.id);
    expect(violations.length).toBeGreaterThan(0);

    const ruleIdPattern = /^\d+\.\d+(\.\d+)?$/;
    for (const v of violations) {
      expect(AUDIT_VALID_SEVERITIES.has(v.severity)).toBe(true);
      expect(ruleIdPattern.test(v.ruleId)).toBe(true);
    }
  }
);

// ============================================================
// THEN STEPS — UC3-S04 (failure)
// ============================================================

Then(
  'the system displays an error indicating no document is available',
  async function (this: CustomWorld) {
    await expect(this.page.locator('#error-no-document')).toBeVisible({ timeout: 5000 });
    await expect(this.page.locator('#audit-report')).not.toBeVisible({ timeout: 3000 });
  }
);

Then(
  'no Audit Report is created in the database',
  async function (this: CustomWorld) {
    const count = await countAuditReports(FIXTURES.nonexistentDocumentId);
    expect(count).toBe(0);
  }
);

// ============================================================
// THEN STEPS — UC3-S05 (severity categorisation)
// ============================================================

Then(
  'the Audit Report displays a Critical violation count',
  async function (this: CustomWorld) {
    const el = this.page.locator('#audit-summary-critical');
    await expect(el).toBeVisible({ timeout: 5000 });
    const text = (await el.textContent()) ?? '';
    expect(text).toMatch(/\d+/);
    // Must show at least 1 Critical
    const criticalCount = parseInt(text.match(/\d+/)?.[0] ?? '0', 10);
    expect(criticalCount).toBeGreaterThan(0);
  }
);

Then(
  'the Audit Report displays a Serious violation count',
  async function (this: CustomWorld) {
    const el = this.page.locator('#audit-summary-serious');
    await expect(el).toBeVisible({ timeout: 5000 });
    const text = (await el.textContent()) ?? '';
    const seriousCount = parseInt(text.match(/\d+/)?.[0] ?? '0', 10);
    expect(seriousCount).toBeGreaterThan(0);
  }
);

Then(
  'the Audit Report displays a Minor violation count',
  async function (this: CustomWorld) {
    const el = this.page.locator('#audit-summary-minor');
    await expect(el).toBeVisible({ timeout: 5000 });
    const text = (await el.textContent()) ?? '';
    const minorCount = parseInt(text.match(/\d+/)?.[0] ?? '0', 10);
    expect(minorCount).toBeGreaterThan(0);
  }
);

Then(
  'no violation has a severity outside Critical, Serious, or Minor',
  async function (this: CustomWorld) {
    // UI check
    const items = this.page.locator('#violation-list li');
    const uiCount = await items.count();
    for (let i = 0; i < uiCount; i++) {
      const severity = await items.nth(i).getAttribute('data-severity');
      expect(AUDIT_VALID_SEVERITIES.has(severity ?? '')).toBe(true);
    }

    // DB check
    const report = await getLatestAuditReport(FIXTURES.allSeverityDocumentId);
    expect(report).not.toBeNull();
    const violations = await getAuditViolations(report!.id);
    for (const v of violations) {
      expect(AUDIT_VALID_SEVERITIES.has(v.severity)).toBe(true);
    }
  }
);

// ============================================================
// THEN STEPS — UC3-S06 (QR1: 100% WCAG rule coverage)
// ============================================================

Then(
  'every WCAG 2.2 AA rule in the Guideline set is evaluated during the audit',
  async function (this: CustomWorld) {
    // The violations-document-id fixture only covers 3 rules.
    // For the QR1 oracle we query the full AuditViolation table across all
    // audit runs in this scenario (the Before hook clears violations first,
    // so any rows present were created by this scenario's audit call).
    const evaluatedRuleIds = await getDistinctAuditRuleIds();
    const evaluatedSet = new Set(evaluatedRuleIds);
    const expectedSet  = new Set(GUIDELINE_RULE_IDS);

    for (const ruleId of expectedSet) {
      expect(evaluatedSet.has(ruleId)).toBe(true);
    }
  }
);

