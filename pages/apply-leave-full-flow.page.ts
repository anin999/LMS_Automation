import { expect, type Locator, type Page } from '@playwright/test';
import { LoginPage } from './login.page';

export class ApplyLeaveFullFlowPage {
  private readonly loginPage: LoginPage;
  private readonly sidebar: Locator;
  private readonly createRequestsMenu: Locator;
  private readonly leaveOption: Locator;
  private readonly myRequestsMenu: Locator;
  private readonly appliedLeaveOption: Locator;
  private readonly dashboardLink: Locator;
  private readonly quoteHeading: Locator;
  private readonly quoteCloseButton: Locator;
  private readonly addLeaveHeading: Locator;
  private readonly leaveDays: Locator;
  private readonly fromDate: Locator;
  private readonly tillDate: Locator;
  private readonly leavePurpose: Locator;
  private readonly backToWorkDate: Locator;
  private readonly addButton: Locator;
  private readonly appliedLeaveHeading: Locator;
  private readonly appliedLeaveTable: Locator;
  private readonly submissionAlert: Locator;

  constructor(private readonly page: Page) {
    this.loginPage = new LoginPage(page);
    this.sidebar = page.getByRole('complementary');
    this.createRequestsMenu = this.sidebar.getByRole('link', { name: /Create Requests/ });
    this.leaveOption = this.createRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Leave/ });
    this.myRequestsMenu = this.sidebar.getByRole('link', { name: /My Requests/ });
    this.appliedLeaveOption = this.myRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Leave/ });
    this.dashboardLink = this.sidebar.getByRole('link', { name: /Dashboard/ });
    this.quoteHeading = page.getByRole('heading', { name: 'Quote of the day', exact: true });
    this.quoteCloseButton = page.getByRole('button', { name: /^CLOSE$/i });
    this.addLeaveHeading = page.getByRole('heading', { name: 'Add Leave', exact: true });
    this.leaveDays = page.locator('input[type="number"]');
    this.fromDate = page
      .getByText('From the date', { exact: true })
      .locator('..')
      .getByRole('textbox');
    this.tillDate = page
      .getByText('Till the date', { exact: true })
      .locator('..')
      .getByRole('textbox');
    this.leavePurpose = page
      .getByText('For the purpose of', { exact: true })
      .locator('..')
      .getByRole('combobox');
    this.backToWorkDate = page
      .getByText('I will be back to work on', { exact: true })
      .locator('..')
      .getByRole('textbox');
    this.addButton = page.getByRole('button', { name: /^Add$/i });
    this.appliedLeaveHeading = page.getByRole('heading', {
      name: 'Applied Leave List',
      exact: true,
    });
    this.appliedLeaveTable = page.getByRole('grid');
    this.submissionAlert = page.getByRole('alert');
  }

  async login(username: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.email.fill(username);
    await this.loginPage.password.fill(password);
    await this.click(this.loginPage.signInButton, 'Sign In');
    await expect(this.page).not.toHaveURL(/\/login(?:[?#].*)?$/);
    await expect(this.sidebar).toBeVisible();
  }

  async openLeaveRequestForm(): Promise<void> {
    await this.click(this.createRequestsMenu, 'Create Requests');
    await expect(this.leaveOption).toBeVisible();
    await this.click(this.leaveOption, 'Create Requests > Leave');
    await expect(this.addLeaveHeading).toBeVisible();
    await this.closeQuotePopupIfVisible();
  }

  async enterLeaveDetails(
    fromDate: string,
    tillDate: string,
    backToWorkDate: string,
    purpose: string,
  ): Promise<void> {
    await this.leaveDays.fill('1');
    await expect(this.leaveDays).toHaveValue('1');
    await this.selectCalendarDate(this.fromDate, fromDate);
    await this.selectCalendarDate(this.tillDate, tillDate);
    await this.leavePurpose.selectOption({ label: purpose.toLowerCase() });
    await expect(this.leavePurpose.locator('option:checked')).toHaveText(
      new RegExp(`^${purpose}$`, 'i'),
    );
    await this.backToWorkDate.fill(backToWorkDate);
    await expect(this.backToWorkDate).toHaveValue(backToWorkDate);

    await expect(this.fromDate).toHaveValue(fromDate);
    await expect(this.tillDate).toHaveValue(tillDate);
    await expect(this.leaveDays).toHaveValue('1');
    await expect(this.leavePurpose.locator('option:checked')).toHaveText(
      new RegExp(`^${purpose}$`, 'i'),
    );
    console.info(
      `Leave details entered: 1 day, ${fromDate} to ${tillDate}, purpose ${purpose}, back to work ${backToWorkDate}`,
    );
  }

  async submitLeave(): Promise<void> {
    await this.closeQuotePopupIfVisible();
    await this.click(this.addButton, 'Add leave request');
    await expect
      .poll(
        async () =>
          (await this.appliedLeaveHeading.isVisible()) ||
          (await this.submissionAlert.isVisible()),
        { message: 'Expected the leave submission to produce a response' },
      )
      .toBe(true);

    if (await this.submissionAlert.isVisible()) {
      const message = (await this.submissionAlert.innerText()).trim();
      if (/already been applied on this date/i.test(message)) {
        console.info('A leave request already exists for this date; verifying the Applied Leave List entry');
      } else if (/leave request added/i.test(message)) {
        console.info(`Leave submission response: ${message}`);
      } else {
        throw new Error(`Leave request was not submitted: ${message}`);
      }
    }
  }

  async openAppliedLeaveList(): Promise<void> {
    for (let attempt = 0; attempt < 2 && !(await this.appliedLeaveOption.isVisible()); attempt += 1) {
      await this.click(this.myRequestsMenu, 'My Requests');
    }
    await expect(this.appliedLeaveOption).toBeVisible();
    await this.click(this.appliedLeaveOption, 'My Requests > Leave');
    await expect(this.appliedLeaveHeading).toBeVisible();
    await expect(this.appliedLeaveTable).toBeVisible();
  }

  async verifyLeaveEntry(fromDate: string, tillDate: string, purpose: string): Promise<void> {
    const matchingRow = this.page
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(fromDate),
          exact: true,
        }),
      })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(tillDate),
          exact: true,
        }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: '1 Day', exact: true }) })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: new RegExp(`^${purpose}$`, 'i'),
        }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) });

    await expect(
      matchingRow.first(),
      `Expected a pending one-day ${purpose} leave from ${this.formatLongDate(fromDate)} in Applied Leave List`,
    ).toBeVisible();
    console.info(`Verified applied leave: ${(await matchingRow.first().innerText()).trim().replace(/\s+/g, ' | ')}`);
  }

  async cancelLeaveEntry(fromDate: string, tillDate: string, reason: string): Promise<void> {
    const matchingRows = this.page
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(fromDate),
          exact: true,
        }),
      })
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(tillDate),
          exact: true,
        }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: '1 Day', exact: true }) })
      .filter({
        has: this.page.getByRole('gridcell', { name: /^Casual Leaves$/i }),
      });
    const pendingRow = matchingRows
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) })
      .first();

    await expect(pendingRow, 'The applied leave must be Pending before cancellation').toBeVisible();
    await this.click(pendingRow.getByRole('link', { name: /cancel/i }), 'Cancel leave request');

    const cancellationDialog = this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Cancel Leave Request', exact: true }),
    });
    await expect(cancellationDialog).toBeVisible();
    const reasonInput = cancellationDialog.getByRole('textbox');
    await reasonInput.fill(reason);
    await expect(reasonInput).toHaveValue(reason);
    console.info(`Cancellation reason entered: ${reason}`);

    await this.click(
      cancellationDialog.getByRole('button', { name: 'Confirm', exact: true }),
      'Confirm leave cancellation',
    );
    await expect(
      matchingRows
        .filter({ has: this.page.getByRole('gridcell', { name: 'Cancelled', exact: true }) })
        .first(),
    ).toBeVisible();
    console.info('Leave request cancelled successfully');
  }

  async navigateToDashboard(): Promise<void> {
    await this.click(this.dashboardLink, 'Dashboard');
    await expect(this.page).toHaveURL(/\/dashboard(?:[?#].*)?$/);
  }

  private async closeQuotePopupIfVisible(): Promise<void> {
    if (await this.quoteHeading.isVisible()) {
      await this.click(this.quoteCloseButton, 'Close Quote of the day popup');
      await expect(this.quoteHeading).toBeHidden();
    }
  }

  private async selectCalendarDate(dateInput: Locator, isoDate: string): Promise<void> {
    const [year, month, day] = isoDate.split('-').map(Number);
    const targetMonth = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
    const calendarDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;

    await this.click(dateInput, `open date picker for ${isoDate}`);
    const calendar = this.page.locator('.bootstrap-datetimepicker-widget:visible').last();
    await expect(calendar).toBeVisible();

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const displayedMonth = (
        await calendar.locator('.datepicker-days th.picker-switch').innerText()
      ).trim();
      if (displayedMonth === targetMonth) {
        break;
      }

      const displayedDate = Date.parse(`${displayedMonth} 1 UTC`);
      const targetDate = Date.UTC(year, month - 1, 1);
      const direction = displayedDate < targetDate ? 'next' : 'previous';
      await this.click(
        calendar.locator(`.datepicker-days th[data-action="${direction}"]`),
        `${direction} month in date picker`,
      );
    }

    await expect(calendar.locator('.datepicker-days th.picker-switch')).toHaveText(targetMonth);
    const targetDay = calendar.locator(
      `.datepicker-days td[data-action="selectDay"][data-day="${calendarDate}"]`,
    );
    await expect(targetDay, `Calendar date ${isoDate} should be selectable`).toBeVisible();
    await this.click(targetDay, `date ${isoDate}`);
    await expect(dateInput).toHaveValue(isoDate);
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
