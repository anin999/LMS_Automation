import { randomBytes, randomUUID } from 'node:crypto';
import { test } from '../fixtures/test';
import { InvalidLoginPage } from '../pages/invalid-login.page';
import { environment } from '../config/environment';

test.describe('Invalid login', () => {
  test('rejects a registered email with an incorrect password', async ({ page, loginPage }) => {
    const { username } = environment.credentials();
    const invalidLoginPage = new InvalidLoginPage(page, loginPage);

    await invalidLoginPage.goto();
    await invalidLoginPage.submitCredentials(username, randomBytes(32).toString('hex'));

    const message = await invalidLoginPage.expectLoginRejected();
    console.warn(`[Invalid Login] invalid password: ${message}`);
  });

  test('rejects an unregistered email with the configured password', async ({ page, loginPage }) => {
    const { password } = environment.credentials();
    const invalidLoginPage = new InvalidLoginPage(page, loginPage);
    const unregisteredEmail = `unregistered-${randomUUID()}@example.invalid`;

    await invalidLoginPage.goto();
    await invalidLoginPage.submitCredentials(unregisteredEmail, password);

    const message = await invalidLoginPage.expectLoginRejected();
    console.warn(`[Invalid Login] invalid email: ${message}`);
  });

  test('rejects an unregistered email with an incorrect password', async ({ page, loginPage }) => {
    const invalidLoginPage = new InvalidLoginPage(page, loginPage);
    const unregisteredEmail = `unregistered-${randomUUID()}@example.invalid`;

    await invalidLoginPage.goto();
    await invalidLoginPage.submitCredentials(unregisteredEmail, randomBytes(32).toString('hex'));

    const message = await invalidLoginPage.expectLoginRejected();
    console.warn(`[Invalid Login] invalid email + invalid password: ${message}`);
  });
});
