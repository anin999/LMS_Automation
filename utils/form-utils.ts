import type { Locator } from '@playwright/test';

type TextField = {
  locator: Locator;
  value: string;
};

export class FormUtils {
  static async fillTextFields(fields: readonly TextField[]): Promise<void> {
    for (const { locator, value } of fields) {
      await locator.fill(value);
    }
  }
}
