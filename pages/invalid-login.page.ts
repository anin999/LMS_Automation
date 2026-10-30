import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { HumanDelay } from '../utils/human-delay';

export class InvalidLoginPage {
  private readonly errorMessage;

  constructor(
    private readonly page: Page,
    private readonly loginPage: LoginPage,
  ) {
    this.errorMessage = page.getByText('These credentials do not match our records.', { exact: true });
  }

  async goto(): Promise<void> {
    await this.loginPage.goto();
  }

  async submitCredentials(email: string, password: string): Promise<void> {
    await HumanDelay.around(this.page, () => this.loginPage.email.fill(email));
    await HumanDelay.around(this.page, () => this.loginPage.password.fill(password));
    await HumanDelay.around(this.page, () => this.loginPage.signInButton.click());
  }

  async expectLoginRejected(): Promise<string> {
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(this.loginPage.email).toBeVisible();
    await expect(this.loginPage.password).toBeVisible();
    await expect(this.errorMessage).toBeVisible();

    const message = (await this.errorMessage.innerText()).trim();
    expect(message).toBe('These credentials do not match our records.');
    return message;
  }
}
