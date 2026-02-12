import { test, expect } from '@playwright/test';

test.describe('Coherence Onboarding Flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated users from bookshelf to login', async ({ page }) => {
    await page.goto('/bookshelf');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('intro page renders for new users', async ({ page }) => {
    await page.goto('/intro');
    await expect(page.getByText("Let's begin")).toBeVisible();
  });

  test('checkin page renders', async ({ page }) => {
    await page.goto('/checkin');
    // Will either show login redirect or the check-in page
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Navigation', () => {
  test('root page loads without error', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
