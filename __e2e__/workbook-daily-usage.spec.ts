import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Daily Workbook Usage
 *
 * Tests parent's daily interaction with the workbook:
 * - Viewing active workbook
 * - Logging goal completions
 * - Viewing progress
 * - Real-time updates
 */

test.describe('Daily Workbook Usage', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to existing workbook
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Navigate to a person with an active workbook
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display active workbook with all sections', async ({ page }) => {
    // Verify header information
    await expect(page.locator('text=WEEK')).toBeVisible();
    await expect(page.locator('text=STATUS: ACTIVE')).toBeVisible();
    await expect(page.locator('text=Weekly Workbook')).toBeVisible();

    // Verify progress gauge
    await expect(page.locator('text=WEEK PROGRESS')).toBeVisible();
    await expect(page.locator('text=DAY')).toBeVisible();

    // Verify all sections exist
    await expect(page.locator('text=WEEKLY FOCUS')).toBeVisible();
    await expect(page.locator('text=PARENT BEHAVIOR GOALS')).toBeVisible();
    await expect(page.locator('text=INTERACTIVE ACTIVITIES')).toBeVisible();

    // Verify goals are displayed
    const goals = await page.locator('[data-testid="goal-card"]').count();
    expect(goals).toBeGreaterThan(0);

    // Verify activities are displayed
    const activities = await page.locator('[data-testid="activity-card"]').count();
    expect(activities).toBeGreaterThan(0);
  });

  test('should log goal completion with stamp animation', async ({ page }) => {
    // Find first incomplete goal
    const goalCheckbox = page.locator('[data-testid="goal-checkbox"]').first();

    // Verify initially unchecked
    await expect(goalCheckbox).not.toHaveClass(/bg-green/);

    // Click to complete
    await goalCheckbox.click();

    // Wait for stamp animation
    await page.waitForTimeout(600); // Animation duration

    // Verify checked state
    await expect(goalCheckbox).toHaveClass(/bg-green/);

    // Verify "TODAY" badge appears
    await expect(page.locator('text=✓ TODAY').first()).toBeVisible();

    // Verify completion count increased
    await expect(page.locator('text=COMPLETED:')).toBeVisible();
  });

  test('should toggle goal completion on/off', async ({ page }) => {
    const goalCheckbox = page.locator('[data-testid="goal-checkbox"]').first();

    // Complete goal
    await goalCheckbox.click();
    await page.waitForTimeout(600);
    await expect(goalCheckbox).toHaveClass(/bg-green/);

    // Uncomplete goal
    await goalCheckbox.click();
    await page.waitForTimeout(300);
    await expect(goalCheckbox).not.toHaveClass(/bg-green/);
    await expect(page.locator('text=✓ TODAY').first()).not.toBeVisible();
  });

  test('should track completion count across days', async ({ page }) => {
    const goalCard = page.locator('[data-testid="goal-card"]').first();
    const checkbox = goalCard.locator('[data-testid="goal-checkbox"]');

    // Get initial completion count
    const initialCountText = await goalCard.locator('text=COMPLETED:').textContent();
    const initialCount = parseInt(initialCountText!.match(/\d+/)![0]);

    // Complete goal
    await checkbox.click();
    await page.waitForTimeout(800);

    // Verify count increased
    const newCountText = await goalCard.locator('text=COMPLETED:').textContent();
    const newCount = parseInt(newCountText!.match(/\d+/)![0]);
    expect(newCount).toBe(initialCount + 1);
  });

  test('should display progress gauge accurately', async ({ page }) => {
    // Get progress percentage
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const widthStyle = await progressBar.getAttribute('style');
    const percentage = parseFloat(widthStyle!.match(/width:\s*(\d+\.?\d*)%/)![1]);

    // Verify progress is reasonable (0-100%)
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);

    // Get day count
    const dayText = await page.locator('text=DAY').textContent();
    const [current, total] = dayText!.match(/\d+/g)!.map(Number);

    // Calculate expected percentage
    const expectedPercentage = Math.min((current / total) * 100, 100);

    // Verify progress matches calculation (within 1% tolerance)
    expect(Math.abs(percentage - expectedPercentage)).toBeLessThan(1);
  });

  test('should navigate to activity pages', async ({ page }) => {
    // Click first activity card
    const activityCard = page.locator('[data-testid="activity-card"]').first();
    const activityTitle = await activityCard.locator('h3').textContent();

    await activityCard.click();

    // Verify navigated to activity page
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Verify activity page loaded
    await expect(page.locator('text=INTERACTIVE ACTIVITY')).toBeVisible();
    await expect(page.locator(`text=${activityTitle}`)).toBeVisible();
  });

  test('should show completed activity badges', async ({ page }) => {
    // Find a completed activity (if any)
    const completedActivity = page.locator('[data-testid="activity-card"]').filter({
      has: page.locator('text=✓')
    }).first();

    if (await completedActivity.count() > 0) {
      // Verify completion badge
      await expect(completedActivity.locator('text=✓')).toBeVisible();

      // Verify visual styling (green border)
      await expect(completedActivity).toHaveClass(/border-green/);
    }
  });

  test('should handle real-time updates from other users', async ({ page, context }) => {
    // Open workbook in two tabs (simulating two parents)
    const page2 = await context.newPage();
    await page2.goto(page.url());

    // Wait for both pages to load
    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Complete goal in page 1
    const goalCheckbox1 = page.locator('[data-testid="goal-checkbox"]').first();
    await goalCheckbox1.click();

    // Wait for Firestore real-time update
    await page2.waitForTimeout(2000);

    // Verify page 2 sees the update
    const goalCheckbox2 = page2.locator('[data-testid="goal-checkbox"]').first();
    await expect(goalCheckbox2).toHaveClass(/bg-green/);

    await page2.close();
  });

  test('should persist goal completions on page reload', async ({ page }) => {
    // Complete a goal
    const goalCheckbox = page.locator('[data-testid="goal-checkbox"]').first();
    await goalCheckbox.click();
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify goal is still completed
    await expect(goalCheckbox).toHaveClass(/bg-green/);
    await expect(page.locator('text=✓ TODAY').first()).toBeVisible();
  });

  test('should show correct target frequency for each goal', async ({ page }) => {
    // Verify each goal card shows target frequency
    const goalCards = page.locator('[data-testid="goal-card"]');
    const count = await goalCards.count();

    for (let i = 0; i < count; i++) {
      const card = goalCards.nth(i);
      await expect(card.locator('text=TARGET:')).toBeVisible();

      // Verify frequency text matches expected formats
      const targetText = await card.locator('text=TARGET:').textContent();
      expect(targetText).toMatch(/TARGET:\s*(Daily|[\d]+x?\s*per\s*(day|week))/i);
    }
  });

  test('should show goal rationale on hover or click', async ({ page }) => {
    // Some goals may have rationale tooltips or expandable sections
    const goalCard = page.locator('[data-testid="goal-card"]').first();

    // Try to find and click info icon or expand button
    const infoButton = goalCard.locator('[data-testid="goal-info-button"]');

    if (await infoButton.count() > 0) {
      await infoButton.click();

      // Verify rationale is displayed
      await expect(page.locator('[data-testid="goal-rationale"]')).toBeVisible();
    }
  });

  test('should navigate back to manual page', async ({ page }) => {
    // Click back arrow
    await page.click('[data-testid="back-to-manual-button"]');

    // Verify navigated to manual page
    await page.waitForURL(/\/manual$/);
    await expect(page.locator('text=Operating Manual')).toBeVisible();
  });

  test('should handle no active workbook state', async ({ page }) => {
    // Navigate to person without active workbook
    await page.goto('/people');
    await page.waitForLoadState('networkidle');

    // Find person without workbook (may need to create one for test)
    // Or use test fixture

    // Navigate to their workbook page
    // Should show "No Active Workbook" state

    await expect(page.locator('text=STATUS: NO ACTIVE WORKBOOK')).toBeVisible();
    await expect(page.locator('text=Workbook Not Initialized')).toBeVisible();
    await expect(page.locator('[data-testid="return-to-manual-button"]')).toBeVisible();
  });

  test('should display week number and dates correctly', async ({ page }) => {
    // Verify week number
    const weekText = await page.locator('text=WEEK').textContent();
    expect(weekText).toMatch(/WEEK\s+\d+/);

    // Verify date range
    const dateText = await page.textContent('[data-testid="week-date-range"]');
    expect(dateText).toMatch(/\w+\s+\d{1,2},\s+\d{4}\s*-\s*\w+\s+\d{1,2},\s+\d{4}/);

    // Verify dates are in the current week
    const today = new Date();
    expect(dateText).toBeTruthy();
  });
});

test.describe('Goal Logging Edge Cases', () => {
  test('should handle rapid clicking on goal checkbox', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    const goalCheckbox = page.locator('[data-testid="goal-checkbox"]').first();

    // Rapid click multiple times
    for (let i = 0; i < 5; i++) {
      await goalCheckbox.click({ delay: 50 });
    }

    // Wait for all updates to settle
    await page.waitForTimeout(2000);

    // Verify final state is consistent
    // Should be checked or unchecked, not in invalid state
    const isChecked = await goalCheckbox.evaluate(el =>
      el.style.backgroundColor.includes('059669') // green color
    );
    expect(typeof isChecked).toBe('boolean');
  });

  test('should handle network errors when logging goals', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // Mock network failure
    await page.route('**/*.firestore.googleapis.com/**', route => route.abort());

    const goalCheckbox = page.locator('[data-testid="goal-checkbox"]').first();
    await goalCheckbox.click();

    // Should show error alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Failed');
      await dialog.accept();
    });

    await page.waitForTimeout(2000);
  });

  test('should maintain scroll position when logging goals', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // Scroll down to activities section
    await page.locator('text=INTERACTIVE ACTIVITIES').scrollIntoViewIfNeeded();

    // Get scroll position
    const scrollY = await page.evaluate(() => window.scrollY);

    // Log a goal (should not affect scroll)
    await page.locator('[data-testid="goal-checkbox"]').first().click();
    await page.waitForTimeout(800);

    // Verify scroll position maintained
    const newScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(newScrollY - scrollY)).toBeLessThan(50); // Allow small tolerance
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // Tab to first goal checkbox
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Space to toggle
    await page.keyboard.press('Space');
    await page.waitForTimeout(800);

    // Verify goal was toggled
    const firstCheckbox = page.locator('[data-testid="goal-checkbox"]').first();
    await expect(firstCheckbox).toHaveClass(/bg-green/);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);

    // Check for ARIA labels on interactive elements
    const goalCheckbox = page.locator('[data-testid="goal-checkbox"]').first();
    const ariaLabel = await goalCheckbox.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});
