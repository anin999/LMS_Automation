import { test } from '../fixtures/test';
import { environment } from '../config/environment';
import { HolidayListPage } from '../pages/holiday-list.page';

test('Holiday List: navigate through every page and return to page 1', async ({ page }) => {
  test.setTimeout(120_000);

  const holidayListPage = new HolidayListPage(page);
  const { username, password } = environment.credentials();

  await test.step('Log in to the platform', () => holidayListPage.login(username, password));
  await test.step('Open the Holiday List', () => holidayListPage.openHolidayList());
  await test.step('Open a holiday and return to the list', () =>
    holidayListPage.openHolidayAndReturnToList(),
  );
  await test.step('Visit all Holiday List pages and return to page 1', async () => {
    await holidayListPage.setPageSize(10);
    await holidayListPage.visitEveryPageAndReturnToFirst();
  });

  console.info('Holiday List test complete; Playwright will close the browser context.');
});
