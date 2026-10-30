import { test, expect } from '../fixtures/test';
import { PasswordResetPage } from '../pages/password-reset.page';
import { TEST_CATEGORIES } from '../test-data/test-categories';

test.describe('Password recovery', () => {
  let passwordResetPage: PasswordResetPage;

  test.beforeEach(async ({ page }) => {
    passwordResetPage = new PasswordResetPage(page);
    await passwordResetPage.goto();
  });

  test('shows the recovery email field and a route back to login', async ({ page }) => {
    await expect(page.getByText('You forgot your password? Here you can easily retrieve a new password.')).toBeVisible();
    await expect(passwordResetPage.email).toBeVisible();
    await expect(passwordResetPage.sendResetLinkButton).toBeVisible();
    await expect(passwordResetPage.loginLink).toHaveAttribute('href', /\/login$/);
  });

  test(`${TEST_CATEGORIES.validation}: blocks a malformed recovery email`, async ({ page }) => {
    await passwordResetPage.email.fill('not-an-email');
    await passwordResetPage.sendResetLinkButton.click();

    const emailIsValid = await passwordResetPage.email.evaluate(
      (input) => (input as HTMLInputElement).validity.valid,
    );
    expect(emailIsValid).toBe(false);
    await expect(page).toHaveURL(/\/password\/reset$/);
  });
});
