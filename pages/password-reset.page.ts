import type { Page } from '@playwright/test';
import { FormUtils } from '../utils/form-utils';

export class PasswordResetPage {
  readonly email;
  readonly sendResetLinkButton;
  readonly loginLink;

  constructor(private readonly page: Page) {
    this.email = page.getByPlaceholder('Email');
    this.sendResetLinkButton = page.getByRole('button', { name: 'Send Password Reset Link' });
    this.loginLink = page.getByRole('link', { name: 'Login' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/password/reset');
  }

  async submitEmail(email: string): Promise<void> {
    await FormUtils.fillTextFields([{ locator: this.email, value: email }]);
    await this.sendResetLinkButton.click();
  }
}
