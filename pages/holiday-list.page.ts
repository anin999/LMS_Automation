import { expect, type Locator, type Page } from '@playwright/test';
import { LoginPage } from './login.page';

type PageRange = {
  first: number;
  last: number;
  total: number;
};

export class HolidayListPage {
  private readonly loginPage: LoginPage;
  private readonly sidebar: Locator;
  private readonly holidaysLink: Locator;
  private readonly holidayHeading: Locator;
  private readonly holidayTable: Locator;
  private readonly entriesSelect: Locator;
  private readonly tableStatus: Locator;
  private readonly nextPageLink: Locator;

  constructor(private readonly page: Page) {
    this.loginPage = new LoginPage(page);
    this.sidebar = page.getByRole('complementary');
    this.holidaysLink = this.sidebar.getByRole('link', { name: /Holidays/ });
    this.holidayHeading = page.getByRole('heading', { name: 'Holidays', exact: true });
    this.holidayTable = page.getByRole('grid');
    this.entriesSelect = page.getByRole('combobox', { name: 'Show entries' });
    this.tableStatus = page.getByRole('status');
    this.nextPageLink = page.getByRole('link', { name: 'Next', exact: true });
  }

  async login(username: string, password: string): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.email.fill(username);
    await this.loginPage.password.fill(password);
    await this.click(this.loginPage.signInButton, 'Sign In');
    await expect(this.page).not.toHaveURL(/\/login(?:[?#].*)?$/);
    await expect(this.sidebar).toBeVisible();
  }

  async openHolidayList(): Promise<void> {
    await this.click(this.holidaysLink, 'Holidays');
    await this.expectHolidayListLoaded();
  }

  async openHolidayAndReturnToList(): Promise<void> {
    const firstViewLink = this.holidayTable.getByRole('link', { name: 'View', exact: true }).first();
    await expect(firstViewLink).toBeVisible();
    await this.click(firstViewLink, 'first holiday View link');
    await expect(this.page).toHaveURL(/\/holidays\/\d+(?:[?#].*)?$/);

    console.info('Navigating back to the Holiday List');
    await this.page.goBack();
    await this.page.waitForTimeout(2_000);
    await this.expectHolidayListLoaded();
  }

  async setPageSize(pageSize: number): Promise<void> {
    console.info(`Selecting ${pageSize} entries per Holiday List page`);
    await this.entriesSelect.selectOption(String(pageSize));
    await this.page.waitForTimeout(2_000);
    await expect(this.tableStatus).toContainText(new RegExp(`Showing 1 to \\d+ of \\d+ entries`));
  }

  async visitEveryPageAndReturnToFirst(): Promise<void> {
    let range = await this.readPageRange();

    while (range.last < range.total) {
      await expect(this.nextPageLink).toBeVisible();
      await this.click(this.nextPageLink, 'Next page');
      const expectedFirst = range.last + 1;
      await expect(this.tableStatus).toContainText(
        new RegExp(`Showing ${expectedFirst} to \\d+ of ${range.total} entries`),
      );
      range = await this.readPageRange();
    }

    if (range.first !== 1) {
      const firstPageLink = this.page.getByRole('link', { name: '1', exact: true });
      await this.click(firstPageLink, 'page 1');
      await expect(this.tableStatus).toContainText(/Showing 1 to \d+ of \d+ entries/);
    }

    await expect(this.holidayHeading).toBeVisible();
    await expect(this.holidayTable).toBeVisible();
    console.info('Holiday List pagination complete; returned to page 1');
  }

  private async expectHolidayListLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/holidays(?:[?#].*)?$/);
    await expect(this.holidayHeading).toBeVisible();
    await expect(this.holidayTable).toBeVisible();
  }

  private async readPageRange(): Promise<PageRange> {
    const status = await this.tableStatus.innerText();
    const match = status.match(/Showing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)\s+entries/);

    if (!match) {
      throw new Error(`Could not determine the current Holiday List page from status: "${status}"`);
    }

    return {
      first: Number(match[1].replaceAll(',', '')),
      last: Number(match[2].replaceAll(',', '')),
      total: Number(match[3].replaceAll(',', '')),
    };
  }

  private async click(locator: Locator, description: string): Promise<void> {
    console.info(`Clicking ${description}`);
    await locator.click();
    await this.page.waitForTimeout(2_000);
  }
}
