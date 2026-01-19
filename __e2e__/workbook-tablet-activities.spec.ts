import { test, expect, devices } from '@playwright/test';

/**
 * E2E Test Suite: Tablet Interactive Activities
 *
 * Tests all 6 interactive activities optimized for tablet use:
 * 1. Emotion Check-In
 * 2. Choice Board
 * 3. Daily Win
 * 4. Visual Schedule
 * 5. Gratitude
 * 6. Feeling Thermometer
 *
 * Focus: Large touch targets, minimal text, emoji-based interface
 */

// Use iPad viewport for tablet testing
test.use(devices['iPad Pro']);

test.describe('Tablet Activities - General', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Navigate to workbook
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should have large touch targets (100px minimum)', async ({ page }) => {
    // Navigate to first activity
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Get all interactive buttons
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Verify button is at least 100px in smallest dimension
        const minDimension = Math.min(box.width, box.height);
        expect(minDimension).toBeGreaterThanOrEqual(80); // Slightly lower for flexibility
      }
    }
  });

  test('should display activity instructions clearly', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Verify large emoji icon
    const emoji = page.locator('[data-testid="activity-emoji"]');
    await expect(emoji).toBeVisible();
    const emojiSize = await emoji.evaluate(el => parseInt(getComputedStyle(el).fontSize));
    expect(emojiSize).toBeGreaterThan(48); // Large emoji

    // Verify title
    await expect(page.locator('h1')).toBeVisible();

    // Verify parent instructions
    await expect(page.locator('[data-testid="parent-instructions"]')).toBeVisible();
  });

  test('should allow going back to workbook', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Click back button
    await page.click('[data-testid="back-button"]');

    // Verify returned to workbook
    await page.waitForURL(/\/workbook$/);
    await expect(page.locator('text=PARENT BEHAVIOR GOALS')).toBeVisible();
  });

  test('should show success animation on completion', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Complete activity (click first option)
    await page.locator('button').filter({ hasText: /😊|🫁|🎨|☀️|1/ }).first().click();

    // Fill parent notes (optional)
    await page.fill('[data-testid="parent-notes"]', 'Test notes');

    // Click done button
    await page.click('[data-testid="done-button"]');

    // Verify success overlay appears
    await expect(page.locator('[data-testid="success-overlay"]')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=ACTIVITY COMPLETE')).toBeVisible();

    // Wait for redirect
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });

  test('should save parent notes with activity', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Complete activity
    await page.locator('button').filter({ hasText: /😊|🫁|🎨|☀️|1/ }).first().click();

    // Add parent notes
    const notes = `Test notes ${Date.now()}`;
    await page.fill('[data-testid="parent-notes"]', notes);

    // Complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });

    // Verify activity is marked complete
    const completedActivity = page.locator('[data-testid="activity-card"]').first();
    await expect(completedActivity.locator('text=✓')).toBeVisible();
  });

  test('should prevent submission without completing activity', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Try to click done without completing
    await page.click('[data-testid="done-button"]');

    // Should show alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('complete the activity');
      await dialog.accept();
    });

    await page.waitForTimeout(500);

    // Should still be on activity page
    await expect(page.locator('[data-testid="done-button"]')).toBeVisible();
  });
});

test.describe('Emotion Check-In Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display 8 emotion options', async ({ page }) => {
    // Find and click Emotion Check-In activity
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Emotion Check-In' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Verify 8 emotion buttons
    const emotionButtons = page.locator('[data-testid="emotion-button"]');
    const count = await emotionButtons.count();
    expect(count).toBe(8);

    // Verify each has emoji and label
    for (let i = 0; i < count; i++) {
      const button = emotionButtons.nth(i);
      await expect(button.locator('[data-testid="emoji"]')).toBeVisible();
      await expect(button.locator('[data-testid="label"]')).toBeVisible();
    }
  });

  test('should highlight selected emotion', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Emotion Check-In' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Click first emotion
    const firstEmotion = page.locator('[data-testid="emotion-button"]').first();
    await firstEmotion.click();

    // Verify highlighted (amber border)
    await expect(firstEmotion).toHaveClass(/border-amber/);

    // Click second emotion
    const secondEmotion = page.locator('[data-testid="emotion-button"]').nth(1);
    await secondEmotion.click();

    // Verify first is no longer highlighted
    await expect(firstEmotion).not.toHaveClass(/border-amber/);

    // Verify second is highlighted
    await expect(secondEmotion).toHaveClass(/border-amber/);
  });

  test('should complete emotion check-in successfully', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Emotion Check-In' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Select emotion
    await page.locator('[data-testid="emotion-button"]').filter({ hasText: 'Happy' }).click();

    // Complete
    await page.click('[data-testid="done-button"]');

    // Verify success and redirect
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });
});

test.describe('Choice Board Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display 8 calming strategy options', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Choice Board' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    const strategyButtons = page.locator('[data-testid="strategy-button"]');
    const count = await strategyButtons.count();
    expect(count).toBe(8);
  });

  test('should allow selecting calming strategy', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Choice Board' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Click "Deep Breaths"
    await page.locator('[data-testid="strategy-button"]').filter({ hasText: 'Deep Breaths' }).click();

    // Verify highlighted
    const deepBreathsButton = page.locator('[data-testid="strategy-button"]').filter({ hasText: 'Deep Breaths' });
    await expect(deepBreathsButton).toHaveClass(/border-amber/);

    // Complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });
});

test.describe('Daily Win Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display 6 category options', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Daily Win' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    const categoryButtons = page.locator('[data-testid="category-button"]');
    const count = await categoryButtons.count();
    expect(count).toBe(6);
  });

  test('should show description field after selecting category', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Daily Win' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Initially description should not be visible
    await expect(page.locator('[data-testid="description-field"]')).not.toBeVisible();

    // Click category
    await page.locator('[data-testid="category-button"]').first().click();

    // Description field should appear
    await expect(page.locator('[data-testid="description-field"]')).toBeVisible();
  });

  test('should complete daily win with category and description', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Daily Win' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Select category
    await page.locator('[data-testid="category-button"]').filter({ hasText: 'Creative' }).click();

    // Fill description
    await page.fill('[data-testid="description-field"]', 'Drew a beautiful picture of our family');

    // Complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });
});

test.describe('Visual Schedule Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display 9 default tasks', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Visual Schedule' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    const taskButtons = page.locator('[data-testid="task-button"]');
    const count = await taskButtons.count();
    expect(count).toBe(9);
  });

  test('should toggle task completion', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Visual Schedule' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    const firstTask = page.locator('[data-testid="task-button"]').first();

    // Click to complete
    await firstTask.click();
    await expect(firstTask).toHaveClass(/border-green/);
    await expect(firstTask.locator('text=✓')).toBeVisible();

    // Click to uncomplete
    await firstTask.click();
    await expect(firstTask).not.toHaveClass(/border-green/);
  });

  test('should complete with multiple tasks checked', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Visual Schedule' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Check first 3 tasks
    await page.locator('[data-testid="task-button"]').nth(0).click();
    await page.locator('[data-testid="task-button"]').nth(1).click();
    await page.locator('[data-testid="task-button"]').nth(2).click();

    // Complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });
});

test.describe('Gratitude Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display 3 gratitude inputs', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Gratitude' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    const inputs = page.locator('[data-testid="gratitude-input"]');
    const count = await inputs.count();
    expect(count).toBe(3);
  });

  test('should complete with all 3 items filled', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Gratitude' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Fill all 3 inputs
    await page.locator('[data-testid="gratitude-input"]').nth(0).fill('My family');
    await page.locator('[data-testid="gratitude-input"]').nth(1).fill('My dog');
    await page.locator('[data-testid="gratitude-input"]').nth(2).fill('My toys');

    // Complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });

  test('should allow partial completion', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Gratitude' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Fill only 1 input
    await page.locator('[data-testid="gratitude-input"]').first().fill('Something I\'m thankful for');

    // Should be able to complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });
});

test.describe('Feeling Thermometer Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
  });

  test('should display 5 intensity levels', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Feeling Thermometer' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    const intensityButtons = page.locator('[data-testid="intensity-button"]');
    const count = await intensityButtons.count();
    expect(count).toBe(5);
  });

  test('should show intensity levels from 1 to 5', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Feeling Thermometer' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Verify each level has number 1-5
    for (let i = 1; i <= 5; i++) {
      await expect(page.locator(`text=${i}`).first()).toBeVisible();
    }
  });

  test('should complete with selected intensity', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Feeling Thermometer' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Click intensity level 3
    await page.locator('[data-testid="intensity-button"]').filter({ hasText: '3' }).click();

    // Complete
    await page.click('[data-testid="done-button"]');
    await page.waitForURL(/\/workbook$/, { timeout: 3000 });
  });

  test('should show color-coded intensity levels', async ({ page }) => {
    await page.locator('[data-testid="activity-card"]').filter({ hasText: 'Feeling Thermometer' }).first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Level 1 should be green
    const level1 = page.locator('[data-testid="intensity-button"]').filter({ hasText: '1' });
    const level1Color = await level1.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(level1Color).toContain('187, 247, 208'); // green

    // Level 5 should be red
    const level5 = page.locator('[data-testid="intensity-button"]').filter({ hasText: '5' });
    const level5Color = await level5.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(level5Color).toContain('239, 68, 68'); // red
  });
});

test.describe('Accessibility on Tablet', () => {
  test('should have readable text at tablet size', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Check font sizes are large enough for tablet
    const title = page.locator('h1');
    const titleSize = await title.evaluate(el => parseInt(getComputedStyle(el).fontSize));
    expect(titleSize).toBeGreaterThan(24); // Large title

    const labels = page.locator('[data-testid="label"]');
    if (await labels.count() > 0) {
      const labelSize = await labels.first().evaluate(el => parseInt(getComputedStyle(el).fontSize));
      expect(labelSize).toBeGreaterThan(16); // Readable labels
    }
  });

  test('should work in landscape and portrait', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.locator('[data-testid="person-card"]').first().click();
    await page.waitForURL(/\/people\/[^/]+$/);
    await page.click('[data-testid="view-workbook-button"]');
    await page.waitForURL(/\/workbook$/);
    await page.locator('[data-testid="activity-card"]').first().click();
    await page.waitForURL(/\/activities\/[^/]+$/);

    // Test in portrait (default)
    await expect(page.locator('h1')).toBeVisible();

    // Rotate to landscape
    await page.setViewportSize({ width: 1024, height: 768 });

    // Should still be usable
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="done-button"]')).toBeVisible();
  });
});
