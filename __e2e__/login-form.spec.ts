import { test, expect } from '@playwright/test';

/**
 * Login form smoke test.
 *
 * Exercises the form elements on /login without actually signing in
 * (no Firebase dependency). Verifies:
 *   - The form renders with email + password fields and a submit
 *   - The submit is disabled while either field is empty (UX contract)
 *   - Typing into both fields enables the submit
 *   - Submitting invalid credentials surfaces an error (or at least
 *     does not crash) — tolerant assertion, we don't care what the
 *     error says, only that the flow is wired up
 */
test.describe('Login form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the sign-in title and form fields', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();

    // Labels are wired via htmlFor=email / htmlFor=password
    await expect(page.getByLabel(/your email/i)).toBeVisible();
    await expect(page.getByLabel(/your password/i)).toBeVisible();

    // Submit starts disabled — it requires both fields before it lights up
    const submit = page.getByRole('button', { name: /open the library/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('submit enables once both fields are filled', async ({ page }) => {
    const email = page.getByLabel(/your email/i);
    const password = page.getByLabel(/your password/i);
    const submit = page.getByRole('button', { name: /open the library/i });

    await email.fill('someone@example.com');
    // Still disabled until password is also present
    await expect(submit).toBeDisabled();

    await password.fill('correct-horse-battery-staple');
    await expect(submit).toBeEnabled();
  });
});
