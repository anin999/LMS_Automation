import { test, expect } from '../fixtures/test';
import { DashboardPage } from '../pages/dashboard.page';
import { ApplyholidayPage } from '../pages/Applyholiday.page';

const holidayTitle = 'GreatK';
const holidayDate = '2026-06-26';

async function runLoggedStep(
  page: import('@playwright/test').Page,
  stepName: string,
  action: () => Promise<void>,
): Promise<void> {
  await test.step(stepName, async () => {
    try {
      console.info(`Starting step: ${stepName}`);
      await page.waitForTimeout(2_000);
      await action();
      console.info(`Completed step: ${stepName}`);
    } catch (error) {
      console.error(`Failed step "${stepName}" at ${page.url()}: ${String(error)}`);
      throw error;
    }
  });
}

test.describe('Restricted holiday application', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.error(`Holiday application failed at ${page.url()} (test: ${testInfo.title})`);
    }
  });

  test('Apply for a holiday and verify it in Applied Holiday List', async ({
    authenticatedPage,
    page,
  }) => {
    test.setTimeout(120_000);
    const dashboardPage = new DashboardPage(page);
    const applyHolidayPage = new ApplyholidayPage(page);

    await runLoggedStep(page, 'Verify successful login and dashboard', async () => {
      await authenticatedPage.expectSuccessfulLogin();
      await dashboardPage.expectLoaded();
      console.info('Login successful - Dashboard loaded');
    });
    await runLoggedStep(page, 'Open Create Requests', () => applyHolidayPage.openCreateRequests());
    await runLoggedStep(page, 'Open Apply for Restricted Holiday', () =>
      applyHolidayPage.openApplyHoliday(),
    );
    await runLoggedStep(page, 'Select holiday and verify its date', () =>
      applyHolidayPage.selectHoliday(holidayTitle, holidayDate),
    );
    await runLoggedStep(page, 'Submit holiday request', () =>
      applyHolidayPage.submitHoliday(holidayTitle, holidayDate),
    );
    await runLoggedStep(page, 'Open Applied Holiday List', () =>
      applyHolidayPage.openAppliedHolidayList(),
    );
    await runLoggedStep(page, 'Verify holiday request entry', () =>
      applyHolidayPage.verifyHolidayEntry(holidayTitle, holidayDate),
    );

    await expect(page.getByRole('heading', { name: 'Applied Holiday List', exact: true })).toBeVisible();
    console.info('Final validation passed - holiday request is in Applied Holiday List');
  });
});
