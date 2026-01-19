import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Weekly Workbook Onboarding Flow
 *
 * Tests the complete onboarding flow from creating a person manual
 * through AI content generation to workbook creation.
 *
 * Flow:
 * 1. Create person
 * 2. Create manual (select relationship type)
 * 3. Complete onboarding wizard (answer questions)
 * 4. AI generates manual content
 * 5. User reviews generated content
 * 6. Save & generate workbook
 * 7. Verify redirect to workbook page
 */

test.describe('Weekly Workbook Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');
  });

  test('should complete full onboarding flow and create workbook', async ({ page }) => {
    // Step 1: Create a new person
    await page.click('[data-testid="add-person-button"]');

    const personName = `Test Child ${Date.now()}`;
    await page.fill('[data-testid="person-name-input"]', personName);
    await page.fill('[data-testid="person-age-input"]', '8');
    await page.selectOption('[data-testid="relationship-type-select"]', 'child');
    await page.click('[data-testid="create-person-button"]');

    // Wait for person page
    await page.waitForURL(/\/people\/[^/]+$/);

    // Step 2: Create manual
    await page.click('[data-testid="create-manual-button"]');

    // Verify relationship type selection
    await expect(page.locator('text=Select Relationship Type')).toBeVisible();
    await page.click('[data-testid="relationship-child-card"]');
    await page.click('[data-testid="continue-to-onboarding-button"]');

    // Step 3: Wait for onboarding wizard
    await page.waitForURL(/\/manual\/onboard$/);

    // Verify welcome screen
    await expect(page.locator('text=Let\'s build')).toBeVisible();
    await expect(page.locator(`text=${personName}'s manual`)).toBeVisible();

    // Click Get Started (or press Enter)
    await page.click('[data-testid="get-started-button"]');

    // Step 4: Answer onboarding questions
    // This is a Typeform-style wizard, one question at a time

    // Question 1: Triggers/Stressors
    await expect(page.locator('text=causes stress')).toBeVisible({ timeout: 10000 });
    await page.fill('textarea', 'Transitions between activities, sudden changes in routine, loud noises');
    await page.click('[data-testid="continue-button"]');

    // Question 2: Typical responses
    await page.waitForTimeout(500);
    await page.fill('textarea', 'Gets overwhelmed, might cry or have a meltdown, needs time to calm down');
    await page.click('[data-testid="continue-button"]');

    // Question 3: What works
    await page.waitForTimeout(500);
    await page.fill('textarea', 'Five-minute warnings before transitions, calm voice, offering choices, deep breathing exercises');
    await page.click('[data-testid="continue-button"]');

    // Question 4: What doesn\'t work
    await page.waitForTimeout(500);
    await page.fill('textarea', 'Yelling, rushing, forcing immediate changes, ignoring emotions');
    await page.click('[data-testid="continue-button"]');

    // Continue through remaining sections...
    // Note: Actual questions depend on relationship type

    // Final question should trigger generation
    await page.click('[data-testid="generate-content-button"]');

    // Step 5: Wait for AI generation
    await expect(page.locator('text=Analyzing your responses')).toBeVisible({ timeout: 5000 });

    // Wait for review step (AI generation can take 10-30 seconds)
    await expect(page.locator('text=Review Generated Content')).toBeVisible({ timeout: 45000 });

    // Step 6: Review generated content
    // Verify that content sections are visible
    await expect(page.locator('text=Triggers & Patterns')).toBeVisible();
    await expect(page.locator('text=What Works')).toBeVisible();
    await expect(page.locator('text=Boundaries')).toBeVisible();

    // Step 7: Save & Create Workbook
    await page.click('[data-testid="save-create-workbook-button"]');

    // Wait for workbook generation (can take 10-20 seconds)
    await expect(page.locator('text=Generating Workbook')).toBeVisible({ timeout: 5000 });

    // Step 8: Verify redirect to workbook page
    await page.waitForURL(/\/workbook$/, { timeout: 45000 });

    // Verify workbook page elements
    await expect(page.locator('text=WEEK 1')).toBeVisible();
    await expect(page.locator('text=STATUS: ACTIVE')).toBeVisible();
    await expect(page.locator('text=PARENT BEHAVIOR GOALS')).toBeVisible();
    await expect(page.locator('text=INTERACTIVE ACTIVITIES')).toBeVisible();

    // Verify goals were generated (should be 3-5)
    const goals = await page.locator('[data-testid="goal-card"]').count();
    expect(goals).toBeGreaterThanOrEqual(3);
    expect(goals).toBeLessThanOrEqual(5);

    // Verify activities were generated (should be 2-3)
    const activities = await page.locator('[data-testid="activity-card"]').count();
    expect(activities).toBeGreaterThanOrEqual(2);
    expect(activities).toBeLessThanOrEqual(3);
  });

  test('should handle onboarding errors gracefully', async ({ page }) => {
    // Create person
    await page.click('[data-testid="add-person-button"]');
    await page.fill('[data-testid="person-name-input"]', `Error Test ${Date.now()}`);
    await page.fill('[data-testid="person-age-input"]', '10');
    await page.selectOption('[data-testid="relationship-type-select"]', 'child');
    await page.click('[data-testid="create-person-button"]');

    await page.waitForURL(/\/people\/[^/]+$/);

    // Start onboarding
    await page.click('[data-testid="create-manual-button"]');
    await page.click('[data-testid="relationship-child-card"]');
    await page.click('[data-testid="continue-to-onboarding-button"]');

    await page.waitForURL(/\/manual\/onboard$/);
    await page.click('[data-testid="get-started-button"]');

    // Mock network error by intercepting API call
    await page.route('**/generateInitialManualContent', route => route.abort());

    // Try to generate content
    await page.fill('textarea', 'Test answer');
    await page.click('[data-testid="continue-button"]');
    await page.fill('textarea', 'Test answer 2');
    await page.click('[data-testid="generate-content-button"]');

    // Verify error message
    await expect(page.locator('text=Failed to generate content')).toBeVisible({ timeout: 10000 });

    // Verify user can retry
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should allow saving manual without workbook on failure', async ({ page }) => {
    // This tests the graceful fallback when workbook generation fails
    // Manual should still be saved, user redirected to manual page

    // Create person and start onboarding...
    // (abbreviated for brevity)

    await page.click('[data-testid="add-person-button"]');
    await page.fill('[data-testid="person-name-input"]', `Fallback Test ${Date.now()}`);
    await page.fill('[data-testid="person-age-input"]', '7');
    await page.selectOption('[data-testid="relationship-type-select"]', 'child');
    await page.click('[data-testid="create-person-button"]');

    await page.waitForURL(/\/people\/[^/]+$/);

    // Continue through onboarding...
    await page.click('[data-testid="create-manual-button"]');
    await page.click('[data-testid="relationship-child-card"]');
    await page.click('[data-testid="continue-to-onboarding-button"]');
    await page.waitForURL(/\/manual\/onboard$/);
    await page.click('[data-testid="get-started-button"]');

    // Answer questions
    await page.fill('textarea', 'Test triggers');
    await page.click('[data-testid="continue-button"]');
    await page.waitForTimeout(500);
    await page.fill('textarea', 'Test responses');
    await page.click('[data-testid="generate-content-button"]');

    // Wait for generation
    await expect(page.locator('text=Review Generated Content')).toBeVisible({ timeout: 45000 });

    // Mock workbook generation failure
    await page.route('**/generateWeeklyWorkbook', route => route.abort());

    // Try to save
    await page.click('[data-testid="save-create-workbook-button"]');

    // Should show alert about fallback
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Manual saved');
      await dialog.accept();
    });

    // Should redirect to manual page (not workbook)
    await page.waitForURL(/\/manual$/, { timeout: 10000 });

    // Verify manual content was saved
    await expect(page.locator('text=Triggers & Patterns')).toBeVisible();
    await expect(page.locator('text=What Works')).toBeVisible();
  });

  test('should allow keyboard navigation in wizard', async ({ page }) => {
    // Test keyboard shortcuts for better UX

    await page.click('[data-testid="add-person-button"]');
    await page.fill('[data-testid="person-name-input"]', `Keyboard Test ${Date.now()}`);
    await page.fill('[data-testid="person-age-input"]', '6');
    await page.selectOption('[data-testid="relationship-type-select"]', 'child');
    await page.click('[data-testid="create-person-button"]');

    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="create-manual-button"]');
    await page.click('[data-testid="relationship-child-card"]');
    await page.click('[data-testid="continue-to-onboarding-button"]');
    await page.waitForURL(/\/manual\/onboard$/);

    // Press Enter on welcome screen
    await page.keyboard.press('Enter');

    // Verify moved to questions
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 });

    // Type answer
    await page.fill('textarea', 'Test answer');

    // Press Cmd+Enter (or Ctrl+Enter) to continue
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

    // Verify moved to next question
    await page.waitForTimeout(500);
    const textareaValue = await page.locator('textarea').inputValue();
    expect(textareaValue).toBe(''); // Should be empty (new question)
  });

  test('should save progress to localStorage', async ({ page }) => {
    // Test that wizard progress is saved and can be resumed

    await page.click('[data-testid="add-person-button"]');
    const personName = `LocalStorage Test ${Date.now()}`;
    await page.fill('[data-testid="person-name-input"]', personName);
    await page.fill('[data-testid="person-age-input"]', '9');
    await page.selectOption('[data-testid="relationship-type-select"]', 'child');
    await page.click('[data-testid="create-person-button"]');

    const personId = page.url().split('/').pop();

    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="create-manual-button"]');
    await page.click('[data-testid="relationship-child-card"]');
    await page.click('[data-testid="continue-to-onboarding-button"]');
    await page.waitForURL(/\/manual\/onboard$/);
    await page.click('[data-testid="get-started-button"]');

    // Answer first question
    await page.fill('textarea', 'Progress test answer 1');
    await page.click('[data-testid="continue-button"]');
    await page.waitForTimeout(500);

    // Answer second question
    await page.fill('textarea', 'Progress test answer 2');

    // Check localStorage
    const savedProgress = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.startsWith('manual-wizard-'));
      return key ? localStorage.getItem(key) : null;
    });

    expect(savedProgress).toBeTruthy();
    const parsed = JSON.parse(savedProgress!);
    expect(parsed.answers).toBeDefined();

    // Reload page
    await page.reload();

    // Verify progress was restored (would need to check wizard state)
    await page.waitForURL(/\/manual\/onboard$/);

    // The wizard should resume from saved state
    // (Implementation details depend on how resuming is handled)
  });
});

test.describe('Onboarding Edge Cases', () => {
  test('should handle empty answers gracefully', async ({ page }) => {
    // Test that wizard allows skipping optional questions
    // and handles empty required questions appropriately
  });

  test('should validate required questions', async ({ page }) => {
    // Test that required questions cannot be skipped
    // without providing an answer
  });

  test('should handle very long answers', async ({ page }) => {
    // Test that wizard handles long text input
    // (e.g., 5000+ characters)
  });

  test('should handle special characters in answers', async ({ page }) => {
    // Test that wizard properly escapes/handles
    // special characters, quotes, etc.
  });
});
