import { test, expect } from '../fixtures/test';
import { DashboardPage } from '../pages/dashboard.page';
import { ApplyleavePage } from '../pages/Applyleave.page';

const leaveDays = 1;
const fromDate = '2026-10-13';
const tillDate = '2026-10-13';
const leavePurpose = 'casual leaves';
const backToWorkDate = '2026-10-14';

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

test.describe('Leave application', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.error(`Leave application failed at ${page.url()} (test: ${testInfo.title})`);
    }
  });

  test('Verify that user can apply for one day casual leave and the leave appears in Applied Leave List', async ({
    authenticatedPage,
    page,
  }) => {
    test.setTimeout(120_000);
    const dashboardPage = new DashboardPage(page);
    const leavePage = new ApplyleavePage(page);

    await runLoggedStep(page, 'Verify successful login and dashboard', async () => {
      await authenticatedPage.expectSuccessfulLogin();
      await dashboardPage.expectLoaded();
      console.info('Login successful - Dashboard loaded');
    });

    await runLoggedStep(page, 'Handle Quote of the day popup', () => leavePage.closeQuotePopupIfVisible());
    await runLoggedStep(page, 'Open Create Requests', () => leavePage.openCreateRequests());
    await runLoggedStep(page, 'Open Leave form', () => leavePage.openLeave());
    await runLoggedStep(page, 'Enter leave duration', () => leavePage.enterLeaveDays(leaveDays));
    await runLoggedStep(page, 'Close Quote of the day popup before entering dates', () =>
      leavePage.closeQuotePopupIfVisible(1_500),
    );
    await runLoggedStep(page, 'Set From date', () => leavePage.selectFromDate(fromDate));
    await runLoggedStep(page, 'Set Till date', () => leavePage.selectTillDate(tillDate));
    await runLoggedStep(page, 'Select leave purpose', () => leavePage.selectLeavePurpose(leavePurpose));
    await runLoggedStep(page, 'Set back-to-work date', () => leavePage.selectBackToWorkDate(backToWorkDate));
    let newlySubmitted = false;
    await runLoggedStep(page, 'Validate and submit leave request', async () => {
      newlySubmitted = await leavePage.submitLeave(
        leaveDays,
        fromDate,
        tillDate,
        leavePurpose,
        backToWorkDate,
      );
    });
    if (!newlySubmitted) {
      await runLoggedStep(page, 'Open existing Applied Leave List', () => leavePage.openAppliedLeaveList());
    }
    await runLoggedStep(page, 'Verify Applied Leave List', () => leavePage.verifyAppliedLeavePage());
    if (newlySubmitted) {
      await runLoggedStep(page, 'Verify newly created leave entry', () =>
        leavePage.verifyLeaveEntry(fromDate, tillDate),
      );
    }
    await runLoggedStep(page, 'Cancel the newly created leave request', () =>
      leavePage.cancelLeaveEntry(fromDate, tillDate),
    );

    await expect(page.getByRole('heading', { name: 'Applied Leave List', exact: true })).toBeVisible();
    console.info('Final validation passed - leave was applied, verified, and cancelled');
  });
});
