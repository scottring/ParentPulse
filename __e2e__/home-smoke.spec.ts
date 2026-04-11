import { test, expect } from '@playwright/test';

/**
 * Home surface smoke test.
 *
 * Does the bare minimum: the landing page loads, the Relish wordmark
 * is in the DOM, and the "three volumes" region renders. If this test
 * fails, the build is broken at a fundamental level (SSR crash, 500,
 * routing broken). No authenticated state is exercised.
 */
test.describe('Home surface (public)', () => {
  test('landing page renders the wordmark and the auth nav', async ({
    page,
  }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    // The Relish wordmark is always present regardless of auth state.
    await expect(page.getByRole('heading', { name: 'Relish' })).toBeVisible();

    // The "Enter the library" nav is always rendered for both signed-in
    // and signed-out visitors (the contents differ, but the landmark
    // is stable). This is a better smoke anchor than the three-volumes
    // region, which only renders for signed-in visitors.
    await expect(
      page.getByRole('navigation', { name: 'Enter the library' }),
    ).toBeVisible();
  });

  test('sign-in link is present for unauthenticated visitors', async ({
    page,
  }) => {
    await page.goto('/');
    // The auth nav uses aria-label "Enter the library"
    const authNav = page.getByRole('navigation', {
      name: 'Enter the library',
    });
    await expect(authNav).toBeVisible();
    await expect(authNav.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
