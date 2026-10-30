import { expect, type Locator, type Page } from '@playwright/test';
import { LoginPage } from './login.page';

export class ApplyHolidayFullFlowPage {
  private readonly loginPage: LoginPage;
  private readonly sidebar: Locator;
  private readonly createRequestsMenu: Locator;
  private readonly applyHolidayOption: Locator;
  private readonly myRequestsMenu: Locator;
  private readonly appliedHolidayOption: Locator;
  private readonly dashboardLink: Locator;
  private readonly quoteHeading: Locator;
  private readonly quoteCloseButton: Locator;
  private readonly applyHolidayHeading: Locator;
  private readonly holidaySelect: Locator;
  private readonly holidayDate: Locator;
  private readonly submitButton: Locator;
  private readonly submissionAlert: Locator;
  private readonly appliedHolidayHeading: Locator;
  private readonly appliedHolidayGrid: Locator;

  constructor(private readonly page: Page) {
    this.loginPage = new LoginPage(page);
    this.sidebar = page.getByRole('complementary');
    this.createRequestsMenu = this.sidebar.getByRole('link', { name: /Create Requests/ });
    this.applyHolidayOption = this.createRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Holiday/ });
    this.myRequestsMenu = this.sidebar.getByRole('link', { name: /My Requests/ });
    this.appliedHolidayOption = this.myRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Holiday/ });
    this.dashboardLink = this.sidebar.getByRole('link', { name: /Dashboard/ });
    this.quoteHeading = page.getByRole('heading', { name: 'Quote of the day', exact: true });
    this.quoteCloseButton = page.getByRole('button', { name: /^Close$/i });
    this.applyHolidayHeading = page.getByRole('heading', {
      name: 'Apply for Restricted Holiday',
      exact: true,
    });
    this.holidaySelect = page.locator('#holiday');
    this.holidayDate = page.locator('#date');
    this.submitButton = page.locator('#addButton');
    this.submissionAlert = page.getByRole('alert');
    this.appliedHolidayHeading = page.getByRole('heading', {
      name: 'Applied Holiday List',
      exact: true,
    });
    this.appliedHolidayGrid = page.getByRole('grid');
  }

  async login(username: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.email.fill(username);
    await this.loginPage.password.fill(password);
    await this.click(this.loginPage.signInButton, 'Sign In');
    await expect(this.page).not.toHaveURL(/\/login(?:[?#].*)?$/);
    await expect(this.sidebar).toBeVisible();
  }

  async openApplyHoliday(): Promise<void> {
    await this.expandMenuUntilVisible(
      this.createRequestsMenu,
      this.applyHolidayOption,
      'Create Requests',
    );
    await this.click(this.applyHolidayOption, 'Create Requests > Holiday');
    await expect(this.applyHolidayHeading).toBeVisible();
    await this.closeQuotePopupIfVisible();
  }

  async selectHoliday(title: string): Promise<string> {
    console.info(`Selecting holiday: ${title}`);
    await this.holidaySelect.selectOption({ label: title });
    await expect(this.holidaySelect.locator('option:checked')).toHaveText(title);

    const date = await this.holidayDate.inputValue();
    if (!date) {
      throw new Error(`Selecting ${title} did not populate a holiday date`);
    }
    console.info(`Selected ${title}; populated date: ${date}`);
    return date;
  }

  async submitHoliday(title: string, date: string): Promise<void> {
    await expect(this.holidaySelect.locator('option:checked')).toHaveText(title);
    await expect(this.holidayDate).toHaveValue(date);
    await this.closeQuotePopupIfVisible();
    await this.click(this.submitButton, 'Submit holiday request');

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
      if (/already.*(applied|requested)|duplicate/i.test(message)) {
        throw new Error(
          `Could not submit a new ${title} request for ${this.formatLongDate(date)}: ${message}`,
        );
      } else if (/added|success|applied|request/i.test(message)) {
        console.info(`Holiday submission response: ${message}`);
      } else {
        throw new Error(`Holiday request was not submitted: ${message}`);
      }
    }
  }

  async openAppliedHolidayList(): Promise<void> {
    await this.expandMenuUntilVisible(this.myRequestsMenu, this.appliedHolidayOption, 'My Requests');
    await this.click(this.appliedHolidayOption, 'My Requests > Holiday');
    await expect(this.appliedHolidayHeading).toBeVisible();
    await expect(this.appliedHolidayGrid).toBeVisible();
  }

  async verifyAndCancelHoliday(title: string, isoDate: string): Promise<void> {
    const matchingRows = this.appliedHolidayGrid
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: title, exact: true }),
      })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(isoDate),
          exact: true,
        }),
      });
    const pendingRow = matchingRows
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) })
      .first();
    const cancelledRow = matchingRows
      .filter({ has: this.page.getByRole('gridcell', { name: 'Cancelled', exact: true }) })
      .first();

    await expect(
      matchingRows.first(),
      `Expected Applied Holiday List to contain ${title} for ${this.formatLongDate(isoDate)}`,
    ).toBeVisible();
    console.info(`Verified holiday request before cancellation: ${(await matchingRows.first().innerText()).trim().replace(/\s+/g, ' | ')}`);

    if ((await pendingRow.count()) === 0) {
      await expect(
        cancelledRow,
        'Holiday request must be Pending or already Cancelled before continuing',
      ).toBeVisible();
      console.info('Holiday request is already Cancelled');
      return;
    }

    const cancelLink = pendingRow.getByRole('link', { name: /cancel/i });
    await expect(cancelLink, 'Expected a cancellation action for the Pending holiday request').toBeVisible();
    const acceptNativeDialog = async (dialog: import('@playwright/test').Dialog): Promise<void> => {
      console.info(`Accepting holiday cancellation confirmation: ${dialog.message()}`);
      await dialog.accept();
    };
    this.page.once('dialog', acceptNativeDialog);
    await this.click(cancelLink, 'Cancel holiday request');

    const cancellationDialog = this.page.getByRole('dialog');
    if (await cancellationDialog.isVisible()) {
      const confirmButton = cancellationDialog.getByRole('button', {
        name: /^(confirm|yes|ok)$/i,
      });
      await expect(confirmButton, 'Expected a confirmation button in the cancellation dialog').toBeVisible();
      await this.click(confirmButton, 'Confirm holiday cancellation');
    }

    await expect(cancelledRow, 'Holiday request should be Cancelled after confirmation').toBeVisible();
    console.info('Holiday request cancelled successfully');
    await this.refreshAndVerifyCancelled(title, isoDate);
  }

  async refreshAndVerifyCancelled(title: string, isoDate: string): Promise<void> {
    console.info('Refreshing Applied Holiday List to verify the saved cancellation status');
    await this.page.reload();
    await expect(this.appliedHolidayHeading).toBeVisible();
    await expect(this.appliedHolidayGrid).toBeVisible();

    const cancelledRow = this.appliedHolidayGrid
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: title, exact: true }),
      })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(isoDate),
          exact: true,
        }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Cancelled', exact: true }) })
      .first();

    await expect(
      cancelledRow,
      `Expected ${title} for ${this.formatLongDate(isoDate)} to remain Cancelled after refresh`,
    ).toBeVisible();
    console.info(`Confirmed ${title} is still Cancelled after refresh`);
  }

  async verifyHoliday(title: string, isoDate: string): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Show entries' }).selectOption('100');
    const matchingRow = this.appliedHolidayGrid
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: title, exact: true }),
      })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(isoDate),
          exact: true,
        }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) });

    await expect(
      matchingRow.first(),
      `Expected newly applied ${title} for ${this.formatLongDate(isoDate)} to be Pending in Applied Holiday List`,
    ).toBeVisible();
    console.info(`Verified applied holiday: ${(await matchingRow.first().innerText()).trim().replace(/\s+/g, ' | ')}`);
  }

  async cancelHoliday(title: string, isoDate: string, remarks: string): Promise<void> {
    const matchingRows = this.appliedHolidayGrid
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: title, exact: true }),
      })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(isoDate),
          exact: true,
        }),
      });
    const pendingRow = matchingRows
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) })
      .first();
    const cancelledRow = matchingRows
      .filter({ has: this.page.getByRole('gridcell', { name: 'Cancelled', exact: true }) })
      .first();

    await expect(pendingRow, 'The newly submitted holiday must be Pending before cancellation').toBeVisible();
    const cancelLink = pendingRow.getByRole('link', { name: /cancel/i });
    await expect(cancelLink, 'Expected a Cancel action for the Pending holiday').toBeVisible();

    const acceptNativeDialog = async (dialog: import('@playwright/test').Dialog): Promise<void> => {
      console.info(`Accepting holiday cancellation confirmation: ${dialog.message()}`);
      await dialog.accept();
    };
    this.page.once('dialog', acceptNativeDialog);
    await this.click(cancelLink, 'Cancel holiday request');

    const confirmationDialog = this.page.getByRole('dialog');
    if (await confirmationDialog.isVisible()) {
      const remarksField = confirmationDialog.getByRole('textbox');
      await expect(remarksField, 'Expected a remarks field in the holiday cancellation dialog').toBeVisible();
      await remarksField.fill(remarks);
      await expect(remarksField).toHaveValue(remarks);
      console.info(`Holiday cancellation remarks entered: ${remarks}`);

      const confirmButton = confirmationDialog.getByRole('button', {
        name: /^(confirm|yes|ok|submit|cancel request)$/i,
      });
      await expect(confirmButton, 'Expected a submit/confirm button in the cancellation dialog').toBeVisible();
      await this.click(confirmButton, 'Confirm holiday cancellation');
    } else {
      throw new Error('Expected a holiday cancellation dialog with a remarks field');
    }

    await expect(cancelledRow, 'Holiday request should be Cancelled after confirmation').toBeVisible();
    console.info('Holiday request cancelled successfully');
    await this.refreshAndVerifyCancelled(title, isoDate);
  }

  async navigateToDashboard(): Promise<void> {
    await this.click(this.dashboardLink, 'Dashboard');
    await expect(this.page).toHaveURL(/\/dashboard(?:[?#].*)?$/);
  }

  private async expandMenuUntilVisible(
    menu: Locator,
    option: Locator,
    menuName: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < 2 && !(await option.isVisible()); attempt += 1) {
      await this.click(menu, menuName);
    }
    await expect(option, `${menuName} should reveal its navigation option`).toBeVisible();
  }

  private async closeQuotePopupIfVisible(): Promise<void> {
    if (await this.quoteHeading.isVisible()) {
      await this.click(this.quoteCloseButton, 'Close Quote of the day popup');
      await expect(this.quoteHeading).toBeHidden();
    }
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

  private async click(locator: Locator, description: string): Promise<void> {
    console.info(`Clicking ${description}`);
    await locator.click();
    await this.page.waitForTimeout(2_000);
  }
}
