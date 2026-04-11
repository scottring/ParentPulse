import { test, expect } from '@playwright/test';

/**
 * Cross-page navigation smoke test — home → register.
 *
 * Proves that client-side routing works end-to-end for the "new
 * visitor" entry path. Catches Next.js build breakage, broken Link
 * hrefs, hydration mismatches, and regressions in the register form
 * shell. No Firebase auth — we stop before submission.
 */
test.describe('Register surface', () => {
  test('visitor can navigate from home to register and see the form', async ({
    page,
  }) => {
    await page.goto('/');

    // The auth nav on the home page has a "Begin a volume" link that
    // points to /register. It sits next to the sign-in link.
    await page
      .getByRole('navigation', { name: 'Enter the library' })
      .getByRole('link', { name: /begin a volume/i })
      .click();

    await expect(page).toHaveURL(/\/register/);

    // Register form renders name/email/password fields + submit
    await expect(
      page.getByRole('heading', { name: /create your library/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('direct /register navigation also renders the form', async ({
    page,
  }) => {
    // Guard against the "only works via client-side navigation" trap.
    const response = await page.goto('/register');
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole('heading', { name: /create your library/i }),
    ).toBeVisible();
  });
});
