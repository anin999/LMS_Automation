import type { Page } from '@playwright/test';
import { FormUtils } from '../utils/form-utils';

export class LoginPage {
  readonly email;
  readonly password;
  readonly rememberMe;
  readonly signInButton;
  readonly forgotPasswordLink;
  readonly googleSignInLink;

  constructor(private readonly page: Page) {
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.rememberMe = page.getByRole('checkbox', { name: 'Remember Me' });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'I forgot my password' });
    this.googleSignInLink = page.getByRole('link', { name: 'Sign in with Google' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signIn(email: string, password: string): Promise<void> {
    await FormUtils.fillTextFields([
      { locator: this.email, value: email },
      { locator: this.password, value: password },
    ]);
    await this.signInButton.click();
  }

  async expectInvalidCredentialsMessage(): Promise<void> {
    await this.page.getByText('These credentials do not match our records.', { exact: true }).waitFor();
  }
}
