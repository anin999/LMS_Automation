import { randomBytes, randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures/test';
import { TEST_CATEGORIES } from '../test-data/test-categories';

test.describe('Login page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('shows accessible sign-in controls and recovery options', async ({ loginPage, page }) => {
    await expect(page).toHaveTitle(/LeaveManagementSystem.*Login/);
    await expect(loginPage.email).toBeVisible();
    await expect(loginPage.password).toBeVisible();
    await expect(loginPage.rememberMe).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toHaveAttribute('href', /\/password\/reset$/);
    await expect(loginPage.googleSignInLink).toHaveAttribute('href', /\/auth\/google$/);
  });

  test(`${TEST_CATEGORIES.validation}: blocks an email address with invalid syntax`, async ({ loginPage }) => {
    await loginPage.email.fill('not-an-email');
    await loginPage.signInButton.click();

    const emailIsValid = await loginPage.email.evaluate((input) => (input as HTMLInputElement).validity.valid);
    expect(emailIsValid).toBe(false);
    await expect(loginPage.signInButton).toBeVisible();
  });

  test(`${TEST_CATEGORIES.negative}: shows feedback for credentials that do not exist`, async ({ loginPage, page }) => {
    await loginPage.signIn(
      `qa-${randomUUID()}@example.invalid`,
      randomBytes(32).toString('hex'),
    );

    await expect(page).toHaveURL(/\/login$/);
    await loginPage.expectInvalidCredentialsMessage();
  });
});
