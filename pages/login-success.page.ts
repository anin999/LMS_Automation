import { expect, type Page } from '@playwright/test';

export class LoginSuccessPage {
  constructor(private readonly page: Page) {}

  async expectSuccessfulLogin(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login(?:[?#].*)?$/);
    await expect(this.page.getByPlaceholder('Email')).toBeHidden();
  }
}
