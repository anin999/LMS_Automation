import { expect, type Locator, type Page } from '@playwright/test';

export class ComboLeavePage {
  private readonly sidebar: Locator;
  private readonly createRequestsMenu: Locator;
  private readonly myRequestsMenu: Locator;
  private readonly applyCompoOption: Locator;
  private readonly appliedCompoOption: Locator;
  private readonly quoteHeading: Locator;
  private readonly quoteCloseButton: Locator;
  private readonly applyCompoHeading: Locator;
  private readonly compoDate: Locator;
  private readonly compoProject: Locator;
  private readonly applyButton: Locator;
  private readonly appliedCompoHeading: Locator;
  private readonly appliedCompoGrid: Locator;
  private readonly searchInput: Locator;
  private readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.sidebar = page.getByRole('complementary');
    this.createRequestsMenu = this.sidebar.getByRole('link', { name: /Create Requests/ });
    this.myRequestsMenu = this.sidebar.getByRole('link', { name: /My Requests/ });
    this.applyCompoOption = this.createRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Compo/ });
    this.appliedCompoOption = this.myRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Compo/ });
    this.quoteHeading = page.getByRole('heading', { name: 'Quote of the day', exact: true });
    this.quoteCloseButton = page.getByRole('button', { name: /^Close$/i });
    this.applyCompoHeading = page.getByRole('heading', { name: 'Apply for Compo', exact: true });
    this.compoDate = page.locator('#compo_date');
    this.compoProject = page.locator('#compo_project');
    this.applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    this.appliedCompoHeading = page.getByRole('heading', { name: "Applied Compo's", exact: true });
    this.appliedCompoGrid = page.getByRole('grid');
    this.searchInput = page.getByRole('searchbox', { name: 'Search:', exact: true });
    this.alert = page.getByRole('alert');
  }

  async closeQuotePopupIfVisible(): Promise<void> {
    if (!(await this.quoteHeading.isVisible())) {
      console.info('Quote of the day popup not displayed - continuing');
      return;
    }

    console.info('Quote of the day popup displayed');
    await this.quoteCloseButton.click();
    await expect(this.quoteHeading).toBeHidden();
    console.info('Quote of the day popup closed');
  }

  async openApplyCompo(): Promise<void> {
    console.info('Clicking Create Requests');
    if (!(await this.applyCompoOption.isVisible())) {
      await this.createRequestsMenu.click();
    }
    await expect(this.applyCompoOption).toBeVisible();
    console.info('Create Requests opened');
    console.info('Clicking Compo');
    await this.applyCompoOption.click();
    await expect(this.applyCompoHeading).toBeVisible();
    console.info('Apply for Compo page loaded successfully');
  }

  async findAvailableCompoDate(): Promise<string> {
    console.info('Checking Applied Compo for an unused work date');
    console.info('Clicking My Requests');
    if (!(await this.appliedCompoOption.isVisible())) {
      await this.myRequestsMenu.click();
    }
    await expect(this.appliedCompoOption).toBeVisible();
    console.info('Clicking Applied Compo');
    await this.appliedCompoOption.click();
    await expect(this.appliedCompoHeading).toBeVisible();
    await expect(this.appliedCompoGrid).toBeVisible();
    await this.searchInput.clear();
    await this.page.getByRole('combobox', { name: 'Show entries' }).selectOption('100');
    await expect.poll(async () => {
      const status = (await this.page.getByRole('status').innerText()).trim();
      const counts = status.match(/^Showing 1 to (\d+) of (\d+) entries$/);
      return counts !== null && counts[1] === counts[2];
    }).toBe(true);

    const rows = await this.appliedCompoGrid.getByRole('row').all();
    const usedDates = new Set<string>();
    for (const row of rows) {
      const cells = row.getByRole('gridcell');
      if (await cells.count() > 0) {
        usedDates.add((await cells.first().innerText()).trim());
      }
    }

    const candidate = new Date();
    candidate.setDate(candidate.getDate() - 2);
    for (let attempt = 0; attempt < 90; attempt += 1) {
      if (candidate.getDay() !== 0 && candidate.getDay() !== 6) {
        const isoDate = [
          candidate.getFullYear(),
          String(candidate.getMonth() + 1).padStart(2, '0'),
          String(candidate.getDate()).padStart(2, '0'),
        ].join('-');
        const formattedDate = this.formatLongDate(isoDate);
        if (!usedDates.has(formattedDate)) {
          console.info(`Unused Compo work date found: ${isoDate}`);
          return isoDate;
        }
      }
      candidate.setDate(candidate.getDate() - 1);
    }

    throw new Error('No unused Compo work date found in the previous 90 days');
  }

  async selectCompoDate(isoDate: string): Promise<void> {
    const [year, month, day] = isoDate.split('-').map(Number);
    const monthHeading = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
    const calendarDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;

    await this.compoDate.click();
    const calendar = this.page.locator('.bootstrap-datetimepicker-widget:visible').last();
    await expect(calendar).toBeVisible();

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const currentMonth = (await calendar.locator('.datepicker-days th.picker-switch').innerText()).trim();
      if (currentMonth === monthHeading) {
        break;
      }

      const currentDate = Date.parse(`${currentMonth} 1 UTC`);
      const targetDate = Date.UTC(year, month - 1, 1);
      const direction = currentDate < targetDate ? 'next' : 'previous';
      await calendar.locator(`.datepicker-days th[data-action="${direction}"]`).click();
    }

    await expect(calendar.locator('.datepicker-days th.picker-switch')).toHaveText(monthHeading);
    const dateCell = calendar.locator(
      `.datepicker-days td[data-action="selectDay"][data-day="${calendarDate}"]`,
    );
    await expect(dateCell, `Compo date ${isoDate} should be available in the calendar`).toBeVisible();
    await expect(dateCell).not.toHaveClass(/disabled/);
    await dateCell.click();
    await expect(this.compoDate).toHaveValue(isoDate);
    console.info(`Compo work date selected: ${isoDate}`);
  }

  async enterProject(project: string): Promise<void> {
    await this.compoProject.fill(project);
    await expect(this.compoProject).toHaveValue(project);
    console.info(`Compo project entered: ${project}`);
  }

  async submitCompo(isoDate: string, project: string): Promise<void> {
    await expect(this.compoDate).toHaveValue(isoDate);
    await expect(this.compoProject).toHaveValue(project);
    await this.closeQuotePopupIfVisible();
    console.info('Compo details validated - clicking Apply');
    await this.applyButton.click();
    await expect.poll(async () => (
      (await this.appliedCompoHeading.isVisible()) ||
      (await this.alert.isVisible())
    )).toBe(true);

    if (await this.alert.isVisible()) {
      const message = (await this.alert.innerText()).trim();
      if (!/compo.*(added|applied|success)/i.test(message)) {
        throw new Error(`Compo request was not submitted: ${message}`);
      }
      console.info(`Compo request accepted: ${message}`);
      await expect(this.appliedCompoHeading).toBeVisible();
    }
  }

  async openAppliedCompoList(): Promise<void> {
    if (await this.appliedCompoHeading.isVisible()) {
      return;
    }

    console.info('Clicking My Requests');
    if (!(await this.appliedCompoOption.isVisible())) {
      await this.myRequestsMenu.click();
    }
    await expect(this.appliedCompoOption).toBeVisible();
    console.info('Clicking Applied Compo');
    await this.appliedCompoOption.click();
  }

  async verifyAppliedCompo(isoDate: string, project: string): Promise<void> {
    await expect(this.appliedCompoHeading).toBeVisible();
    await expect(this.appliedCompoGrid).toBeVisible();
    console.info("Applied Compo's page loaded successfully");

    await this.searchInput.fill(project);
    const formattedDate = this.formatLongDate(isoDate);
    const matchingRow = this.appliedCompoGrid
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name: formattedDate, exact: true }) })
      .filter({ has: this.page.getByRole('gridcell', { name: project, exact: true }) });

    await expect(
      matchingRow,
      `Expected Applied Compo's to contain ${project} for ${formattedDate}`,
    ).toBeVisible();
    console.info('Matching Compo found in Applied Compo list');
    console.info(`Applied Compo row details: ${(await matchingRow.innerText()).trim().replace(/\s+/g, ' | ')}`);
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
