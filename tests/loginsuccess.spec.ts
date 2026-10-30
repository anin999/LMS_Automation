import { test } from '../fixtures/test';

test('Loginsuccess', async ({ authenticatedPage }) => {
  await authenticatedPage.expectSuccessfulLogin();
});
