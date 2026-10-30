import { test } from '../fixtures/test';
import { environment } from '../config/environment';
import { ApplyHolidayFullFlowPage } from '../pages/apply-holiday-full-flow.page';

const holidayTitle = 'Test Holiday 2';
const cancellationRemarks = 'testcancel';

test('Apply, cancel, refresh, and verify Test Holiday 2', async ({ page }) => {
  test.setTimeout(180_000);

  const holidayPage = new ApplyHolidayFullFlowPage(page);
  const { username, password } = environment.credentials();
  let holidayDate = '';

  await test.step('Log in to the platform', () => holidayPage.login(username, password));
  await test.step('Open Create Requests > Holiday', () => holidayPage.openApplyHoliday());
  await test.step('Select Test Holiday 2', async () => {
    holidayDate = await holidayPage.selectHoliday(holidayTitle);
  });
  await test.step('Submit Test Holiday 2 request', () =>
    holidayPage.submitHoliday(holidayTitle, holidayDate),
  );
  await test.step('Open My Requests > Holiday and verify the request', async () => {
    await holidayPage.openAppliedHolidayList();
    await holidayPage.verifyHoliday(holidayTitle, holidayDate);
  });
  await test.step('Cancel Test Holiday 2 with remarks', () =>
    holidayPage.cancelHoliday(holidayTitle, holidayDate, cancellationRemarks),
  );
  await test.step('Navigate to Dashboard', () => holidayPage.navigateToDashboard());

  console.info('Holiday apply, cancel, and refresh verification flow complete; Playwright will close the browser context.');
});
