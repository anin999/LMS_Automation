import { test, expect } from '../fixtures/test';

test.describe('Dashboard access', () => {
  test('redirects unauthenticated visitors to login', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });
});
