import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures/test';
import { DashboardPage } from '../pages/dashboard.page';
import { ComboLeavePage } from '../pages/comboleave.page';

async function runLoggedStep(
  page: import('@playwright/test').Page,
  stepName: string,
  action: () => Promise<void>,
): Promise<void> {
  await test.step(stepName, async () => {
    try {
      await page.waitForTimeout(2_000);
      await action();
    } catch (error) {
      console.error(`Failed action "${stepName}" at ${page.url()}: ${String(error)}`);
      throw error;
    }
  });
}

test('Apply Compo and verify the same entry in Applied Compo', async ({ authenticatedPage, page }) => {
  test.setTimeout(120_000);
  const dashboardPage = new DashboardPage(page);
  const comboLeavePage = new ComboLeavePage(page);
  let compoDate = '';
  let project = '';

  await runLoggedStep(page, 'Verify successful login and dashboard', async () => {
    await authenticatedPage.expectSuccessfulLogin();
    await dashboardPage.expectLoaded();
    console.info('Login successful - Dashboard loaded');
  });
  await runLoggedStep(page, 'Close optional Quote of the day popup', () =>
    comboLeavePage.closeQuotePopupIfVisible(),
  );
  await runLoggedStep(page, 'Find an unused Compo work date', async () => {
    compoDate = await comboLeavePage.findAvailableCompoDate();
    project = `Playwright Compo ${compoDate} ${randomUUID()}`;
  });
  await runLoggedStep(page, 'Open Apply for Compo', () => comboLeavePage.openApplyCompo());
  await runLoggedStep(page, 'Close popup before entering Compo details', () =>
    comboLeavePage.closeQuotePopupIfVisible(),
  );
  await runLoggedStep(page, 'Select Compo work date', () => comboLeavePage.selectCompoDate(compoDate));
  await runLoggedStep(page, 'Enter Compo project', () => comboLeavePage.enterProject(project));
  await runLoggedStep(page, 'Submit Compo request', () => comboLeavePage.submitCompo(compoDate, project));
  await runLoggedStep(page, 'Open Applied Compo list', () => comboLeavePage.openAppliedCompoList());
  await runLoggedStep(page, 'Verify matching Compo entry', () =>
    comboLeavePage.verifyAppliedCompo(compoDate, project),
  );

  await expect(page.getByRole('heading', { name: "Applied Compo's", exact: true })).toBeVisible();
  console.info('Final validation passed - same Compo is present in Applied Compo');
});
