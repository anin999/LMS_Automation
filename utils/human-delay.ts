import type { Page } from '@playwright/test';

export class HumanDelay {
  static async around<T>(page: Page, action: () => Promise<T>): Promise<T> {
    await page.waitForTimeout(2_000);
    const result = await action();
    await page.waitForTimeout(2_000);
    return result;
  }
}
