import { expect, type Locator, type Page } from '@playwright/test';

export class ApplyleavePage {
  private readonly createRequestsMenu: Locator;
  private readonly myRequestsMenu: Locator;
  private readonly leaveOption: Locator;
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
    this.createRequestsMenu = page
      .getByRole('complementary')
      .getByRole('link', { name: /Create Requests/ });
    this.myRequestsMenu = page.getByRole('complementary').getByRole('link', { name: /My Requests/ });
    this.leaveOption = this.createRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Leave/ });
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
    this.appliedLeaveHeading = page.getByRole('heading', { name: 'Applied Leave List', exact: true });
    this.appliedLeaveTable = page.getByRole('grid');
    this.submissionAlert = page.getByRole('alert');
  }

  async closeQuotePopupIfVisible(waitForAppearanceMs = 0): Promise<void> {
    let popupIsVisible = await this.quoteHeading.isVisible();
    if (!popupIsVisible && waitForAppearanceMs > 0) {
      try {
        await this.quoteHeading.waitFor({ state: 'visible', timeout: waitForAppearanceMs });
        popupIsVisible = true;
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'TimeoutError') {
          throw error;
        }
      }
    }

    if (!popupIsVisible) {
      console.info('Quote of the day popup not displayed - continuing');
      return;
    }

    await expect(this.quoteHeading).toBeVisible();
    console.info('Quote of the day popup displayed');
    await this.quoteCloseButton.click();
    console.info('Quote of the day popup closed');
    await expect(this.quoteHeading).toBeHidden();
  }

  async openCreateRequests(): Promise<void> {
    console.info('Clicking Create Requests');
    for (let attempt = 0; attempt < 2 && !(await this.leaveOption.isVisible()); attempt += 1) {
      await this.createRequestsMenu.click();
    }
    await expect(this.leaveOption, 'Create Requests should reveal the Leave navigation option').toBeVisible();
    console.info('Create Requests opened');
  }

  async openLeave(): Promise<void> {
    console.info('Clicking Leave');
    await this.leaveOption.click();
    await expect(this.addLeaveHeading).toBeVisible();
    console.info('Add Leave page loaded successfully');
  }

  async enterLeaveDays(days: number): Promise<void> {
    await this.leaveDays.fill(String(days));
    await expect(this.leaveDays).toHaveValue(String(days));
    console.info(`Entered leave duration: ${days} day`);
  }

  async selectFromDate(date: string): Promise<void> {
    await this.selectDateFromCalendar(this.fromDate, date);
    console.info(`From date selected: ${date}`);
  }

  async selectTillDate(date: string): Promise<void> {
    await this.selectDateFromCalendar(this.tillDate, date);
    console.info(`Till date selected: ${date}`);
  }

  async selectLeavePurpose(purpose: string): Promise<void> {
    await this.leavePurpose.selectOption({ label: purpose.toLowerCase() });
    await expect(this.leavePurpose.locator('option:checked')).toHaveText(new RegExp(`^${purpose}$`, 'i'));
    console.info(`Leave purpose selected: ${purpose.replace(/\b\w/g, (letter) => letter.toUpperCase())}`);
  }

  async selectBackToWorkDate(date: string): Promise<void> {
    await this.backToWorkDate.fill(date);
    await expect(this.backToWorkDate).toHaveValue(date);
    console.info(`Back-to-work date selected: ${date}`);
  }

  async submitLeave(
    days: number,
    fromDate: string,
    tillDate: string,
    purpose: string,
    backToWorkDate: string,
  ): Promise<boolean> {
    const from = Date.parse(`${fromDate}T00:00:00Z`);
    const till = Date.parse(`${tillDate}T00:00:00Z`);
    const inclusiveCalendarDays = (till - from) / 86_400_000 + 1;

    await expect(this.leaveDays).toHaveValue(String(days));
    await expect(this.fromDate).toHaveValue(fromDate);
    await expect(this.tillDate).toHaveValue(tillDate);
    expect(
      inclusiveCalendarDays,
      `A ${days}-day request must span exactly ${days} calendar day(s): ${fromDate} through ${tillDate}`,
    ).toBe(days);
    await expect(this.leavePurpose.locator('option:checked')).toHaveText(new RegExp(`^${purpose}$`, 'i'));
    await expect(this.backToWorkDate).toHaveValue(backToWorkDate);
    await this.closeQuotePopupIfVisible();
    console.info('All leave details validated - clicking ADD');
    await this.addButton.click();
    console.info('ADD button clicked');
    await expect
      .poll(async () => (await this.appliedLeaveHeading.isVisible()) || (await this.submissionAlert.isVisible()))
      .toBe(true);

    if (await this.submissionAlert.isVisible()) {
      const message = (await this.submissionAlert.innerText()).trim();
      if (/already been applied on this date/i.test(message)) {
        console.info('Leave already exists for the requested date - validating the existing Applied Leave List entry');
        return false;
      }
      if (/leave request added/i.test(message)) {
        console.info('Leave request accepted by the application');
        return true;
      }
      throw new Error(`Leave request was not submitted: ${message}`);
    }

    return true;
  }

  async openAppliedLeaveList(): Promise<void> {
    console.info('Clicking My Requests');
    await this.myRequestsMenu.click();
    const appliedLeaveOption = this.myRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Leave/ });
    await expect(appliedLeaveOption).toBeVisible();
    await appliedLeaveOption.click();
  }

  async verifyAppliedLeavePage(): Promise<void> {
    await expect(this.appliedLeaveHeading).toBeVisible();
    await expect(this.appliedLeaveTable).toBeVisible();
    console.info('Applied Leave List page loaded successfully');
  }

  async verifyLeaveEntry(fromDate: string, tillDate: string): Promise<void> {
    const formattedFromDate = this.formatLongDate(fromDate);
    const formattedTillDate = this.formatLongDate(tillDate);
    const matchingRow = this.page
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: formattedFromDate, exact: true }),
      })
      .filter({
        has: this.page.getByRole('gridcell', { name: formattedTillDate, exact: true }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: '1 Day', exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Casual Leaves', exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) })
      .first();

    let currentPageText = await this.appliedLeaveTable.innerText();
    const seenPages = new Set([currentPageText]);

    while (!(await matchingRow.isVisible())) {
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

      await nextPage.click();
      await expect(this.appliedLeaveTable).toBeVisible();
      await expect.poll(() => this.appliedLeaveTable.innerText()).not.toBe(currentPageText);
      currentPageText = await this.appliedLeaveTable.innerText();

      if (seenPages.has(currentPageText)) {
        break;
      }
      seenPages.add(currentPageText);
    }

    await expect(matchingRow, 'Expected the new one-day casual leave request to appear in Applied Leave List').toBeVisible();
    console.info('New leave entry found in Applied Leave List');
    console.info(`Applied leave row details: ${(await matchingRow.innerText()).trim().replace(/\s+/g, ' | ')}`);
  }

  async cancelLeaveEntry(fromDate: string, tillDate: string): Promise<void> {
    const formattedFromDate = this.formatLongDate(fromDate);
    const formattedTillDate = this.formatLongDate(tillDate);
    const matchingRows = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name: formattedFromDate, exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: formattedTillDate, exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: '1 Day', exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: 'Casual Leaves', exact: true }) });
    const pendingRow = matchingRows
      .filter({ has: this.page.getByRole('gridcell', { name: 'Pending', exact: true }) })
      .first();

    if ((await pendingRow.count()) === 0) {
      await expect(
        matchingRows.filter({ has: this.page.getByRole('gridcell', { name: 'Cancelled', exact: true }) }).first(),
        'Expected the matching leave to be either Pending or already Cancelled',
      ).toBeVisible();
      console.info('Matching leave request is already cancelled');
      return;
    }
    await expect(pendingRow, 'The newly applied leave must be Pending before cancellation').toBeVisible();
    const cancelLink = pendingRow.getByRole('link', { name: /cancel/i });
    await expect(cancelLink).toBeVisible();
    console.info('Cancelling the newly applied leave request');
    await cancelLink.click();
    const cancellationDialog = this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Cancel Leave Request', exact: true }),
    });
    await expect(cancellationDialog).toBeVisible();
    await this.page.waitForTimeout(2_000);
    await cancellationDialog.getByRole('textbox').fill('Automated test cleanup');
    await this.page.waitForTimeout(2_000);
    await cancellationDialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(
      matchingRows.filter({ has: this.page.getByRole('gridcell', { name: 'Cancelled', exact: true }) }).first(),
    ).toBeVisible();
    console.info('Leave request cancelled successfully');
  }

  private formatLongDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private async selectDateFromCalendar(dateInput: Locator, isoDate: string): Promise<void> {
    const [year, month, day] = isoDate.split('-').map(Number);
    const targetMonth = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
    const [inputYear, inputMonth, inputDay] = isoDate.split('-');
    const calendarDate = `${inputMonth}/${inputDay}/${inputYear}`;

    await dateInput.click();
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
      await calendar.locator(`.datepicker-days th[data-action="${direction}"]`).click();
    }

    await expect(calendar.locator('.datepicker-days th.picker-switch')).toHaveText(targetMonth);
    const targetDay = calendar.locator(
      `.datepicker-days td[data-action="selectDay"][data-day="${calendarDate}"]`,
    );
    await expect(targetDay, `Calendar date ${isoDate} should be selectable`).toBeVisible();
    await targetDay.click();
    await expect(dateInput).toHaveValue(isoDate);
  }
}
