import { expect, type Locator, type Page } from '@playwright/test';

export class ApplyholidayPage {
  private readonly createRequestsMenu: Locator;
  private readonly holidayOption: Locator;
  private readonly myRequestsMenu: Locator;
  private readonly appliedHolidayOption: Locator;
  private readonly applyHolidayHeading: Locator;
  private readonly holidaySelect: Locator;
  private readonly holidayDate: Locator;
  private readonly addButton: Locator;
  private readonly appliedHolidayHeading: Locator;
  private readonly appliedHolidayTable: Locator;
  private readonly submissionAlert: Locator;

  constructor(private readonly page: Page) {
    const sidebar = page.getByRole('complementary');
    this.createRequestsMenu = sidebar.getByRole('link', { name: /Create Requests/ });
    this.holidayOption = this.createRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Holiday/ });
    this.myRequestsMenu = sidebar.getByRole('link', { name: /My Requests/ });
    this.appliedHolidayOption = this.myRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Holiday/ });
    this.applyHolidayHeading = page.getByRole('heading', {
      name: 'Apply for Restricted Holiday',
      exact: true,
    });
    this.holidaySelect = page.locator('#holiday');
    this.holidayDate = page.locator('#date');
    this.addButton = page.locator('#addButton');
    this.appliedHolidayHeading = page.getByRole('heading', {
      name: 'Applied Holiday List',
      exact: true,
    });
    this.appliedHolidayTable = page.getByRole('grid');
    this.submissionAlert = page.getByRole('alert');
  }

  async openCreateRequests(): Promise<void> {
    if (!(await this.holidayOption.isVisible())) {
      console.info('Clicking Create Requests');
      await this.createRequestsMenu.click();
      await expect(this.holidayOption).toBeVisible();
      console.info('Create Requests menu opened');
    }
  }

  async openApplyHoliday(): Promise<void> {
    console.info('Clicking Create Requests > Holiday');
    await this.holidayOption.click();
    await expect(this.applyHolidayHeading).toBeVisible();
    console.info('Apply for Restricted Holiday form loaded');
  }

  async selectHoliday(title: string, date: string): Promise<void> {
    console.info(`Selecting holiday: ${title}`);
    await this.holidaySelect.selectOption({ label: title });
    await expect(this.holidaySelect.locator('option:checked')).toHaveText(title);
    console.info(`Holiday selection changed to: ${title}`);

    console.info('Verifying the holiday date populated by the selection');
    await expect(this.holidayDate).toHaveValue(date);
    console.info(`Holiday date populated: ${date}`);
  }

  async submitHoliday(title: string, date: string): Promise<void> {
    await expect(this.holidaySelect.locator('option:checked')).toHaveText(title);
    await expect(this.holidayDate).toHaveValue(date);

    console.info('Clicking Add to submit the holiday request');
    await this.addButton.click();
    console.info('Add button clicked; waiting 2 seconds before checking submission');
    await this.page.waitForTimeout(2_000);

    await expect
      .poll(
        async () =>
          (await this.submissionAlert.isVisible()) ||
          (await this.appliedHolidayHeading.isVisible()) ||
          /\/requested-holidays(?:[?#].*)?$/.test(this.page.url()),
        { message: 'Expected the holiday submission to produce a response' },
      )
      .toBe(true);

    if (await this.submissionAlert.isVisible()) {
      const message = (await this.submissionAlert.innerText()).trim();
      console.info(`Holiday submission response: ${message}`);
      expect(message, 'Holiday submission should be accepted').toMatch(/added|success|applied|request/i);
    }
  }

  async openAppliedHolidayList(): Promise<void> {
    if (!(await this.appliedHolidayHeading.isVisible())) {
      console.info('Clicking My Requests');
      await this.myRequestsMenu.click();
      await expect(this.appliedHolidayOption).toBeVisible();
      console.info('Clicking My Requests > Holiday');
      await this.appliedHolidayOption.click();
    }

    await expect(this.appliedHolidayHeading).toBeVisible();
    await expect(this.appliedHolidayTable).toBeVisible();
    console.info('Applied Holiday List loaded');
  }

  async verifyHolidayEntry(title: string, date: string): Promise<void> {
    const formattedDate = this.formatLongDate(date);
    const matchingRow = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name: title, exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: formattedDate, exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) });

    let currentTableText = await this.appliedHolidayTable.innerText();
    const seenPages = new Set([currentTableText]);

    while ((await matchingRow.count()) === 0) {
      const nextPage = this.page
        .getByRole('link', { name: /next/i })
        .or(this.page.getByRole('button', { name: /next/i }))
        .first();

      if (
        !(await nextPage.isVisible()) ||
        !(await nextPage.isEnabled()) ||
        (await nextPage.getAttribute('aria-disabled')) === 'true'
      ) {
        break;
      }

      console.info('Clicking Next to search the next Applied Holiday List page');
      await nextPage.click();
      await expect.poll(() => this.appliedHolidayTable.innerText()).not.toBe(currentTableText);
      currentTableText = await this.appliedHolidayTable.innerText();
      if (seenPages.has(currentTableText)) {
        break;
      }
      seenPages.add(currentTableText);
    }

    await expect(
      matchingRow.first(),
      `Expected ${title} on ${formattedDate} with Pending status in Applied Holiday List`,
    ).toBeVisible();
    console.info('Holiday request verified in Applied Holiday List');
    console.info(`Applied holiday row: ${(await matchingRow.first().innerText()).trim().replace(/\s+/g, ' | ')}`);
  }

  private formatLongDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
}
