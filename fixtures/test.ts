import { test as base, expect } from '@playwright/test';
import { environment } from '../config/environment';
import { DashboardPage } from '../pages/dashboard.page';
import { LoginPage } from '../pages/login.page';
import { LoginSuccessPage } from '../pages/login-success.page';

export type AppTestFixtures = {
  appUrl: string;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: LoginSuccessPage;
};

export const test = base.extend<AppTestFixtures>({
  appUrl: async ({}, use) => {
    await use(environment.baseUrl);
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  authenticatedPage: async ({ loginPage, page }, use) => {
    const loginSuccessPage = new LoginSuccessPage(page);
    const { username, password } = environment.credentials();
    await loginPage.goto();
    await loginPage.signIn(username, password);
    await loginSuccessPage.expectSuccessfulLogin();
    await use(loginSuccessPage);
  },
});

export { expect };
