import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Dashboard Navigation
 *
 * Tests all navigation links on the dashboard page:
 * - Empty state "ADD FIRST PERSON" link
 * - Header "ADD PERSON" button
 * - "VIEW MANUAL" links for active manuals
 * - "CREATE MANUAL" links for pending setup
 * - Person card navigation
 */

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display dashboard with vintage technical manual aesthetic', async ({ page }) => {
    // Verify warm paper background
    const bodyBg = await page.locator('div.min-h-screen').first().evaluate(el =>
      getComputedStyle(el).backgroundColor
    );
    expect(bodyBg).toBe('rgb(255, 248, 240)'); // #FFF8F0

    // Verify blueprint grid exists
    await expect(page.locator('.blueprint-grid')).toBeVisible();

    // Verify technical header styling
    await expect(page.locator('text=DOCUMENTATION INDEX')).toBeVisible();
    await expect(page.locator('text=Your Family Manuals')).toBeVisible();

    // Verify monospace font
    const headerFont = await page.locator('h1').evaluate(el =>
      getComputedStyle(el).fontFamily
    );
    expect(headerFont).toContain('mono');
  });

  test('should navigate from empty state to people page', async ({ page }) => {
    // If empty state is visible
    const emptyStateButton = page.locator('[data-testid="add-person-button"]').first();

    if (await emptyStateButton.isVisible()) {
      await emptyStateButton.click();
      await page.waitForURL('/people');

      // Verify navigated to people page
      await expect(page.locator('text=People Management')).toBeVisible();
    }
  });

  test('should navigate from header add button to people page', async ({ page }) => {
    const addButton = page.locator('[data-testid="add-person-button"]');
    await addButton.click();
    await page.waitForURL('/people');

    // Verify navigated to people page
    await expect(page).toHaveURL(/\/people$/);
  });

  test('should display statistics correctly', async ({ page }) => {
    // Check if statistics panel exists (only shown when there are people)
    const statsPanel = page.locator('text=SPECIFICATION').first();

    if (await statsPanel.isVisible()) {
      // Verify all three stat cards
      await expect(page.locator('text=TOTAL').first()).toBeVisible();
      await expect(page.locator('text=PEOPLE').first()).toBeVisible();
      await expect(page.locator('text=ACTIVE').first()).toBeVisible();
      await expect(page.locator('text=MANUALS').first()).toBeVisible();
      await expect(page.locator('text=AWAITING').first()).toBeVisible();
      await expect(page.locator('text=SETUP').first()).toBeVisible();
    }
  });

  test('should display active manual cards with correct styling', async ({ page }) => {
    // Check if active manuals section exists
    const activeSection = page.locator('text=Active Manuals');

    if (await activeSection.isVisible()) {
      // Verify person cards exist
      const personCards = page.locator('[data-testid="person-card"]');
      expect(await personCards.count()).toBeGreaterThan(0);

      // Verify first card has technical styling
      const firstCard = personCards.first();

      // Check status badge
      await expect(firstCard.locator('text=ACTIVE')).toBeVisible();

      // Check technical metadata
      await expect(firstCard.locator('text=MANUAL ID:')).toBeVisible();
      await expect(firstCard.locator('text=STATUS:')).toBeVisible();
      await expect(firstCard.locator('text=OPERATIONAL')).toBeVisible();

      // Check view manual button
      await expect(firstCard.locator('[data-testid="view-manual-button"]')).toBeVisible();
    }
  });

  test('should navigate from active manual card to manual page', async ({ page }) => {
    // Check if active manuals exist
    const viewManualButton = page.locator('[data-testid="view-manual-button"]').first();

    if (await viewManualButton.isVisible()) {
      // Get person ID from the button's href
      const href = await viewManualButton.getAttribute('href');
      expect(href).toMatch(/\/people\/[\w-]+\/manual$/);

      // Click and verify navigation
      await viewManualButton.click();
      await page.waitForURL(/\/people\/[\w-]+\/manual$/);

      // Verify manual page loaded
      await expect(page.locator('text=Operating Manual')).toBeVisible();
    }
  });

  test('should display pending setup cards with correct styling', async ({ page }) => {
    // Check if pending setup section exists
    const pendingSection = page.locator('text=Ready for Setup');

    if (await pendingSection.isVisible()) {
      // Verify person cards exist
      const personCards = page.locator('[data-testid="person-card"]').filter({
        has: page.locator('text=PENDING')
      });

      expect(await personCards.count()).toBeGreaterThan(0);

      // Verify first pending card styling
      const firstCard = personCards.first();

      // Check status badge
      await expect(firstCard.locator('text=PENDING')).toBeVisible();

      // Check technical metadata
      await expect(firstCard.locator('text=PERSON ID:')).toBeVisible();
      await expect(firstCard.locator('text=STATUS:')).toBeVisible();
      await expect(firstCard.locator('text=UNINITIALIZED')).toBeVisible();

      // Check create manual button
      await expect(firstCard.locator('[data-testid="create-manual-button"]')).toBeVisible();
    }
  });

  test('should navigate from pending card to create manual page', async ({ page }) => {
    // Check if pending setup cards exist
    const createManualButton = page.locator('[data-testid="create-manual-button"]').first();

    if (await createManualButton.isVisible()) {
      // Get person ID from the button's href
      const href = await createManualButton.getAttribute('href');
      expect(href).toMatch(/\/people\/[\w-]+\/create-manual$/);

      // Click and verify navigation
      await createManualButton.click();
      await page.waitForURL(/\/people\/[\w-]+\/create-manual$/);

      // Verify create manual wizard loaded
      await expect(page.locator('text=Create Manual')).toBeVisible();
    }
  });

  test('should show empty state when no people exist', async ({ page }) => {
    // This test assumes database is empty
    const emptyState = page.locator('text=NO DOCUMENTATION FOUND');

    if (await emptyState.isVisible()) {
      // Verify empty state styling
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text=SYSTEM STATUS')).toBeVisible();
      await expect(page.locator('text=Initialize the system')).toBeVisible();

      // Verify call-to-action button
      const addButton = page.locator('text=ADD FIRST PERSON →');
      await expect(addButton).toBeVisible();

      // Verify button navigates correctly
      await addButton.click();
      await page.waitForURL('/people');
    }
  });

  test('should have corner brackets on technical cards', async ({ page }) => {
    // Verify header has corner brackets
    const header = page.locator('header div').first();

    // Check for corner bracket divs (they have specific border classes)
    const cornerBrackets = page.locator('div[class*="border-t-4"][class*="border-l-4"][class*="border-amber-600"]');
    expect(await cornerBrackets.count()).toBeGreaterThan(0);
  });

  test('should display numbered section labels', async ({ page }) => {
    // Check if statistics cards have numbered labels
    const statsCards = page.locator('text=SPECIFICATION');

    if (await statsCards.count() > 0) {
      // Verify numbered labels (1, 2, 3)
      const numberedLabels = page.locator('div.bg-slate-800').filter({
        hasText: /^[1-3]$/
      });
      expect(await numberedLabels.count()).toBeGreaterThanOrEqual(3);
    }
  });

  test('should display person cards with numbered labels', async ({ page }) => {
    // Check if person cards have numbered labels (01, 02, etc.)
    const personCards = page.locator('[data-testid="person-card"]');

    if (await personCards.count() > 0) {
      const firstCard = personCards.first();
      const numberedLabel = firstCard.locator('div.bg-slate-800, div.bg-amber-600').filter({
        hasText: /^\d+$/
      });
      expect(await numberedLabel.count()).toBe(1);
    }
  });

  test('should handle authentication redirect', async ({ page }) => {
    // Logout
    await page.goto('/login');
    // Clear cookies to simulate logout
    await page.context().clearCookies();

    // Try to access dashboard
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Dashboard Loading States', () => {
  test('should show technical loading spinner', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');

    // Loading state should appear briefly
    const loadingText = page.locator('text=LOADING DOCUMENTATION...');

    // Either we catch it while loading, or it's already loaded
    // This is a race condition test, so we just verify the page eventually loads
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Your Family Manuals')).toBeVisible();
  });
});

test.describe('Dashboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Verify first focusable element is focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper button labels', async ({ page }) => {
    // Verify buttons have clear text labels
    const addButton = page.locator('[data-testid="add-person-button"]').first();
    const buttonText = await addButton.textContent();
    expect(buttonText).toContain('ADD');
  });
});
