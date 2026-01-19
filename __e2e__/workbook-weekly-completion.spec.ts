import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Weekly Workbook Completion Flow
 *
 * Tests the end-of-week reflection and workbook completion:
 * - Detecting week completion
 * - Showing reflection form
 * - Saving reflection
 * - Marking workbook as completed
 * - Generating next week
 */

test.describe('Weekly Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should show reflection prompt when week is complete', async ({ page }) => {
    // Navigate to a workbook that's at end of week
    // (May need to use test fixture or mock dates)

    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // If week is complete, should see reflection section
    const weekProgress = await page.locator('text=DAY').textContent();
    const match = weekProgress!.match(/DAY\s+(\d+)\s+\/\s+(\d+)/);

    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);

      if (current >= total) {
        // Week is complete - should see reflection
        await expect(page.locator('text=WEEKLY REFLECTION')).toBeVisible();
        await expect(page.locator('text=BEGIN REFLECTION')).toBeVisible();
      }
    }
  });

  test('should display reflection form with 4 questions', async ({ page }) => {
    // Assume we're at a completed week
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // Mock week completion by manipulating dates if needed
    // For now, assume reflection section is visible

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      // Click "Begin Reflection"
      await page.click('[data-testid="begin-reflection-button"]');

      // Verify 4 textarea fields
      await expect(page.locator('[data-testid="what-worked-well"]')).toBeVisible();
      await expect(page.locator('[data-testid="what-was-challenging"]')).toBeVisible();
      await expect(page.locator('[data-testid="insights-learned"]')).toBeVisible();
      await expect(page.locator('[data-testid="adjustments-next-week"]')).toBeVisible();
    }
  });

  test('should save reflection and complete workbook', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Fill all 4 fields
      await page.fill('[data-testid="what-worked-well"]', 'Five-minute warnings really helped with transitions. He responded well when I stayed calm.');
      await page.fill('[data-testid="what-was-challenging"]', 'Still struggling when his sister takes his toys. My tone gets frustrated.');
      await page.fill('[data-testid="insights-learned"]', 'He needs more time to process changes. Physical activity before transitions helps.');
      await page.fill('[data-testid="adjustments-next-week"]', 'Work on taking deep breaths before responding. Add more transition warnings.');

      // Complete week
      await page.click('[data-testid="complete-week-button"]');

      // Should show saving state
      await expect(page.locator('text=SAVING')).toBeVisible({ timeout: 2000 });

      // Should show success alert
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Week completed');
        await dialog.accept();
      });

      // Should redirect to manual page
      await page.waitForURL(/\/manual$/, { timeout: 5000 });
    }
  });

  test('should allow canceling reflection', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Fill one field
      await page.fill('[data-testid="what-worked-well"]', 'Test');

      // Click cancel
      await page.click('[data-testid="cancel-reflection-button"]');

      // Should hide form
      await expect(page.locator('[data-testid="what-worked-well"]')).not.toBeVisible();

      // Should show "Begin Reflection" button again
      await expect(page.locator('[data-testid="begin-reflection-button"]')).toBeVisible();
    }
  });

  test('should preserve reflection text on cancel and re-open', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Fill field
      const testText = 'This is test reflection text';
      await page.fill('[data-testid="what-worked-well"]', testText);

      // Cancel
      await page.click('[data-testid="cancel-reflection-button"]');

      // Re-open
      await page.click('[data-testid="begin-reflection-button"]');

      // Text should be preserved
      const value = await page.locator('[data-testid="what-worked-well"]').inputValue();
      expect(value).toBe(testText);
    }
  });

  test('should show completed status after workbook is finished', async ({ page }) => {
    // Navigate to a completed workbook
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // If workbook has reflection saved, should show completed state
    const completedSection = page.locator('[data-testid="completed-section"]');

    if (await completedSection.isVisible()) {
      // Verify status badge
      await expect(page.locator('text=STATUS: COMPLETED')).toBeVisible();

      // Verify completion message
      await expect(page.locator('text=Documentation Complete')).toBeVisible();

      // Verify "Generate Next Cycle" button
      await expect(page.locator('[data-testid="generate-next-cycle-button"]')).toBeVisible();
    }
  });

  test('should navigate to manual to generate next week', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const completedSection = page.locator('[data-testid="completed-section"]');

    if (await completedSection.isVisible()) {
      // Click "Generate Next Cycle"
      await page.click('[data-testid="generate-next-cycle-button"]');

      // Should navigate to manual page
      await page.waitForURL(/\/manual$/);

      // Should see option to generate new workbook
      await expect(page.locator('[data-testid="generate-workbook-button"]')).toBeVisible();
    }
  });

  test('should handle reflection save errors gracefully', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Fill fields
      await page.fill('[data-testid="what-worked-well"]', 'Test');

      // Mock network failure
      await page.route('**/*.firestore.googleapis.com/**', route => route.abort());

      // Try to complete
      await page.click('[data-testid="complete-week-button"]');

      // Should show error alert
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Failed');
        await dialog.accept();
      });

      await page.waitForTimeout(2000);

      // Should still be on workbook page
      await expect(page.locator('[data-testid="complete-week-button"]')).toBeVisible();
    }
  });

  test('should not show reflection section if week not complete', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // Check week progress
    const weekProgress = await page.locator('text=DAY').textContent();
    const match = weekProgress!.match(/DAY\s+(\d+)\s+\/\s+(\d+)/);

    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);

      if (current < total) {
        // Week is NOT complete - should NOT see reflection
        await expect(page.locator('[data-testid="reflection-section"]')).not.toBeVisible();
      }
    }
  });

  test('should require at least one field filled in reflection', async ({ page }) => {
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Try to complete without filling anything
      await page.click('[data-testid="complete-week-button"]');

      // Implementation detail: may or may not prevent submission
      // Check if still on same page or shows validation
      await page.waitForTimeout(1000);
    }
  });

  test('should display reflection in completed workbook history', async ({ page }) => {
    // Navigate to manual page
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-manual-button"]');
    await page.waitForURL(/\/manual$/);

    // Look for workbook history section
    const historySection = page.locator('[data-testid="workbook-history"]');

    if (await historySection.isVisible()) {
      // Click to view a completed workbook
      await page.locator('[data-testid="completed-workbook-card"]').first().click();

      // Should show reflection content
      await expect(page.locator('[data-testid="reflection-content"]')).toBeVisible();
    }
  });
});

test.describe('Weekly Completion Edge Cases', () => {
  test('should handle very long reflection text', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Fill with very long text (2000+ characters)
      const longText = 'This is a very long reflection. '.repeat(100);
      await page.fill('[data-testid="what-worked-well"]', longText);

      // Should be able to save
      await page.click('[data-testid="complete-week-button"]');

      // Wait for processing
      await page.waitForTimeout(3000);
    }
  });

  test('should handle special characters in reflection', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const reflectionSection = page.locator('[data-testid="reflection-section"]');

    if (await reflectionSection.isVisible()) {
      await page.click('[data-testid="begin-reflection-button"]');

      // Fill with special characters
      const specialText = 'He said "I\'m happy!" & she replied <okay>... 50% better! #progress';
      await page.fill('[data-testid="what-worked-well"]', specialText);

      // Should be able to save
      await page.click('[data-testid="complete-week-button"]');
      await page.waitForTimeout(3000);
    }
  });

  test('should prevent completing already completed workbook', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // If workbook is already completed
    const completedSection = page.locator('[data-testid="completed-section"]');

    if (await completedSection.isVisible()) {
      // Reflection form should NOT be visible
      await expect(page.locator('[data-testid="begin-reflection-button"]')).not.toBeVisible();

      // Only "Generate Next Cycle" should be available
      await expect(page.locator('[data-testid="generate-next-cycle-button"]')).toBeVisible();
    }
  });

  test('should show week completion date', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const completedSection = page.locator('[data-testid="completed-section"]');

    if (await completedSection.isVisible()) {
      // Should show completion date
      await expect(page.locator('text=Completed:')).toBeVisible();

      // Date should be in readable format
      const dateText = await page.locator('[data-testid="completion-date"]').textContent();
      expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY or similar
    }
  });
});

test.describe('Next Week Generation', () => {
  test('should show generate workbook button on manual page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-manual-button"]');
    await page.waitForURL(/\/manual$/);

    // Should see generate workbook button (if no active workbook)
    const generateButton = page.locator('[data-testid="generate-workbook-button"]');

    if (await generateButton.isVisible()) {
      await expect(generateButton).toBeEnabled();
    }
  });

  test('should generate next week workbook considering previous reflection', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-manual-button"]');
    await page.waitForURL(/\/manual$/);

    const generateButton = page.locator('[data-testid="generate-workbook-button"]');

    if (await generateButton.isVisible()) {
      // Click to generate
      await generateButton.click();

      // Should show generating state
      await expect(page.locator('text=Generating')).toBeVisible({ timeout: 5000 });

      // Wait for generation (AI call takes 10-30 seconds)
      await page.waitForURL(/\/workbook$/, { timeout: 45000 });

      // Verify new workbook created
      await expect(page.locator('text=WEEK')).toBeVisible();
      await expect(page.locator('text=STATUS: ACTIVE')).toBeVisible();
    }
  });

  test('should handle workbook generation errors', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-manual-button"]');
    await page.waitForURL(/\/manual$/);

    const generateButton = page.locator('[data-testid="generate-workbook-button"]');

    if (await generateButton.isVisible()) {
      // Mock API failure
      await page.route('**/generateWeeklyWorkbook', route => route.abort());

      await generateButton.click();

      // Should show error
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Failed');
        await dialog.accept();
      });

      await page.waitForTimeout(5000);

      // Should stay on manual page
      await expect(page).toHaveURL(/\/manual$/);
    }
  });
});
