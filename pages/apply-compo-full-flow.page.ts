import { expect, type Locator, type Page } from '@playwright/test';
import { LoginPage } from './login.page';

export class ApplyCompoFullFlowPage {
  private readonly loginPage: LoginPage;
  private readonly sidebar: Locator;
  private readonly createRequestsMenu: Locator;
  private readonly applyCompoOption: Locator;
  private readonly myRequestsMenu: Locator;
  private readonly appliedCompoOption: Locator;
  private readonly dashboardLink: Locator;
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
    this.loginPage = new LoginPage(page);
    this.sidebar = page.getByRole('complementary');
    this.createRequestsMenu = this.sidebar.getByRole('link', { name: /Create Requests/ });
    this.applyCompoOption = this.createRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Compo/ });
    this.myRequestsMenu = this.sidebar.getByRole('link', { name: /My Requests/ });
    this.appliedCompoOption = this.myRequestsMenu
      .locator('xpath=ancestor::li[1]')
      .getByRole('link', { name: /Compo/ });
    this.dashboardLink = this.sidebar.getByRole('link', { name: /Dashboard/ });
    this.quoteHeading = page.getByRole('heading', { name: 'Quote of the day', exact: true });
    this.quoteCloseButton = page.getByRole('button', { name: /^Close$/i });
    this.applyCompoHeading = page.getByRole('heading', { name: 'Apply for Compo', exact: true });
    this.compoDate = page.locator('#compo_date');
    this.compoProject = page.locator('#compo_project');
    this.applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    this.appliedCompoHeading = page.getByRole('heading', {
      name: "Applied Compo's",
      exact: true,
    });
    this.appliedCompoGrid = page.getByRole('grid');
    this.searchInput = page.getByRole('searchbox', { name: 'Search:', exact: true });
    this.alert = page.getByRole('alert');
  }

  async login(username: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.email.fill(username);
    await this.loginPage.password.fill(password);
    await this.click(this.loginPage.signInButton, 'Sign In');
    await expect(this.page).not.toHaveURL(/\/login(?:[?#].*)?$/);
    await expect(this.sidebar).toBeVisible();
  }

  async openApplyCompo(): Promise<void> {
    await this.expandMenuUntilVisible(this.createRequestsMenu, this.applyCompoOption, 'Create Requests');
    await this.click(this.applyCompoOption, 'Create Requests > Compo');
    await expect(this.applyCompoHeading).toBeVisible();
    await this.closeQuotePopupIfVisible();
  }

  async findRandomAvailableDateFromPastSixMonths(): Promise<string> {
    await this.expandMenuUntilVisible(this.myRequestsMenu, this.appliedCompoOption, 'My Requests');
    await this.click(this.appliedCompoOption, 'My Requests > Compo');
    await expect(this.appliedCompoHeading).toBeVisible();
    await expect(this.appliedCompoGrid).toBeVisible();

    await this.searchInput.fill('');
    await this.page.getByRole('combobox', { name: 'Show entries' }).selectOption('100');
    await expect.poll(async () => {
      const status = (await this.page.getByRole('status').innerText()).trim();
      const counts = status.match(/^Showing 1 to ([\d,]+) of ([\d,]+) entries$/);
      return counts !== null && counts[1].replaceAll(',', '') === counts[2].replaceAll(',', '');
    }, { message: 'Expected all Compo entries to load before choosing an unused date' }).toBe(true);

    const usedDates = new Set<string>();
    const rows = await this.appliedCompoGrid.getByRole('row').all();
    for (const row of rows) {
      const cells = row.getByRole('gridcell');
      if ((await cells.count()) > 0) {
        usedDates.add((await cells.first().innerText()).trim());
      }
    }

    const today = new Date();
    const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const earliestDate = new Date(startDate);
    earliestDate.setUTCMonth(earliestDate.getUTCMonth() - 6);

    const availableDates: string[] = [];
    const candidate = new Date(startDate);
    candidate.setUTCDate(candidate.getUTCDate() - 1);

    while (candidate >= earliestDate) {
      const weekday = candidate.getUTCDay();
      if (weekday !== 0 && weekday !== 6) {
        const isoDate = candidate.toISOString().slice(0, 10);
        if (!usedDates.has(this.formatLongDate(isoDate))) {
          availableDates.push(isoDate);
        }
      }
      candidate.setUTCDate(candidate.getUTCDate() - 1);
    }

    if (availableDates.length === 0) {
      throw new Error('No unused weekday found in the past six months for a Compo request');
    }

    const selectedDate = availableDates[Math.floor(Math.random() * availableDates.length)];
    console.info(
      `Selected random unused Compo date from the past six months: ${selectedDate} (${availableDates.length} available dates)`,
    );
    return selectedDate;
  }

  async applyCompo(isoDate: string, project: string): Promise<void> {
    await this.selectCompoDate(isoDate);
    await this.compoProject.fill(project);
    await expect(this.compoDate).toHaveValue(isoDate);
    await expect(this.compoProject).toHaveValue(project);
    await this.closeQuotePopupIfVisible();

    await this.click(this.applyButton, 'Apply Compo request');
    await expect
      .poll(
        async () => (await this.appliedCompoHeading.isVisible()) || (await this.alert.isVisible()),
        { message: 'Expected the Compo submission to produce a response' },
      )
      .toBe(true);

    if (await this.alert.isVisible()) {
      const message = (await this.alert.innerText()).trim();
      if (/compo already exist/i.test(message)) {
        console.info(
          `The application reports an existing Compo request for ${isoDate}; verifying the requested date and project in My Requests`,
        );
      } else if (/compo.*(added|applied|success)/i.test(message)) {
        console.info(`Compo request accepted: ${message}`);
      } else {
        throw new Error(`Compo request was not submitted: ${message}`);
      }
    }
  }

  async openAppliedCompoList(): Promise<void> {
    await this.expandMenuUntilVisible(this.myRequestsMenu, this.appliedCompoOption, 'My Requests');
    await this.click(this.appliedCompoOption, 'My Requests > Compo');
    await expect(this.appliedCompoHeading).toBeVisible();
    await expect(this.appliedCompoGrid).toBeVisible();
  }

  async verifyAppliedCompo(isoDate: string, project: string): Promise<void> {
    await this.searchInput.fill(project);
    const matchingRow = this.appliedCompoGrid
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', {
          name: this.formatLongDate(isoDate),
          exact: true,
        }),
      })
      .filter({ has: this.page.getByRole('gridcell', { name: project }) });

    await expect(
      matchingRow.first(),
      `Expected Applied Compo list to contain ${project} for ${this.formatLongDate(isoDate)}`,
    ).toBeVisible();
    console.info(`Verified Applied Compo request: ${(await matchingRow.first().innerText()).trim().replace(/\s+/g, ' | ')}`);
  }

  async navigateToDashboard(): Promise<void> {
    await this.click(this.dashboardLink, 'Dashboard');
    await expect(this.page).toHaveURL(/\/dashboard(?:[?#].*)?$/);
  }

  private async selectCompoDate(isoDate: string): Promise<void> {
    const [year, month, day] = isoDate.split('-').map(Number);
    const targetMonth = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
    const calendarDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;

    await this.click(this.compoDate, `open work-date picker for ${isoDate}`);
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
        `${direction} month in work-date picker`,
      );
    }

    await expect(calendar.locator('.datepicker-days th.picker-switch')).toHaveText(targetMonth);
    const dateCell = calendar.locator(
      `.datepicker-days td[data-action="selectDay"][data-day="${calendarDate}"]`,
    );
    await expect(dateCell, `Compo work date ${isoDate} should be available`).toBeVisible();
    await expect(dateCell).not.toHaveClass(/disabled/);
    await this.click(dateCell, `work date ${isoDate}`);
    await expect(this.compoDate).toHaveValue(isoDate);
  }

  private async expandMenuUntilVisible(menu: Locator, option: Locator, menuName: string): Promise<void> {
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
